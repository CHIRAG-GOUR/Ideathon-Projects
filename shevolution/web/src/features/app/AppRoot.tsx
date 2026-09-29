'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, query, updateDoc, where } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { EmergencyNumberService } from '@shared/emergency';
import { SMS_TEMPLATES, APP_ORIGIN } from '@shared/message';
import { isEmergency } from '@shared/sos';
import type { SosEvent } from '@shared/types';
import { auth, db, loadConfig } from '@/lib/firebase';
import { api } from '@/lib/api';
import { circleAlertsQuery, DEFAULT_SETTINGS, saveProfile, useAuthUser, useContacts, useList, useProfile } from '@/lib/data';
import { hasNative, invoke, onNative, requestPermission, type NativeInfo } from '@/lib/native';
import { DemoBanner, Logo, Pill, Sheet, Button } from '@/components/ui';
import { SignIn } from '@/components/SignIn';
import { LiveView } from '../live/LiveView';
import { Circle } from '../circle/Circle';
import { Settings } from '../settings/Settings';
import { History } from '../history/History';
import { Home, type Screen } from './Home';
import { Emergency } from './Emergency';
import { Trip, loadTrip } from './Trip';
import { CheckIn } from './CheckIn';
import { Nearby } from './Nearby';
import { FakeCall } from './FakeCall';
import { useSos } from './useSos';

const TITLES: Partial<Record<Screen, string>> = { circle: 'My Safety Circle', trip: 'Safe Trip', timer: 'Safety Timer', checkin: 'Check In', nearby: 'Nearby Help', fakecall: 'Fake Call', settings: 'Settings', history: 'History', alert: 'SOS alert', watch: 'SOS alert' };
const readLS = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const writeLS = (k: string, v: string | null) => {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

export function AppRoot() {
  const { user, ready } = useAuthUser();
  const uid = user && !user.isAnonymous ? user.uid : null;
  const profile = useProfile(uid);
  const contacts = useContacts(uid) ?? [];
  const [native, setNative] = useState<NativeInfo | null>(null);
  const [network, setNetwork] = useState<'online' | 'weak' | 'offline'>('online');
  const [demo, setDemo] = useState(false);
  const [skip, setSkip] = useState(false);
  const [screen, setScreen] = useState<{ s: Screen; arg?: string }>({ s: 'home' });
  const [cancelFlash, setCancelFlash] = useState(false);
  const [disclose, setDisclose] = useState<null | 'location' | 'sms' | 'notifications'>(null);
  const [alertSos, setAlertSos] = useState<{ sosId?: string; error?: string } | null>(null);
  const sos = useSos(demo, contacts);

  const settings = { ...DEFAULT_SETTINGS, ...profile?.settings };
  const region = EmergencyNumberService.forRegion(settings.region || native?.region);
  const name = profile?.name || user?.displayName || 'Me';

  const refreshNative = useCallback(() => {
    const i = invoke<NativeInfo>('info');
    if (i.ok) {
      setNative(i);
      setNetwork(i.network);
    }
  }, []);

  useEffect(() => {
    setDemo(readLS('shev.demo') === '1');
    setSkip(readLS('shev.skipAccount') === '1');
    if (!hasNative()) return;
    refreshNative();
    const launch = invoke<{ alertToken?: string }>('consumeLaunch');
    if (launch.alertToken) setScreen({ s: 'alert', arg: launch.alertToken });
    return onNative((e) => {
      if (e.type === 'network') setNetwork(e.state);
      if (e.type === 'permission' || e.type === 'resume') refreshNative();
      if (e.type === 'alert_opened') setScreen({ s: 'alert', arg: e.token });
    });
  }, [refreshNative]);

  // First sign-in: create the profile.
  useEffect(() => {
    if (uid && profile === null) {
      saveProfile(uid, {
        name: user?.displayName || 'Me',
        phone: null,
        email: user?.email ?? null,
        profile: { shareMedical: false },
        settings: { ...DEFAULT_SETTINGS, region: native?.region ?? 'IN' },
        createdAt: new Date().toISOString(),
      }).catch(() => undefined);
    }
  }, [uid, profile, user, native?.region]);

  // Give the native safety layer everything it needs to run an SOS with no network.
  useEffect(() => {
    if (!hasNative() || demo) return;
    const autoCall = contacts.find((c) => c.id === settings.autoCallContactId && c.channels.call && c.phone);
    invoke('configure', {
      userName: name,
      region: region.region,
      emergencyNumber: region.primary.number,
      timeZone: region.timeZone,
      origin: APP_ORIGIN,
      templates: SMS_TEMPLATES,
      settings: { sound: settings.sound, vibration: settings.vibration, autoCallNumber: autoCall?.phone ?? null, escalateAfterMin: settings.escalateAfterMin, trackingIntervalSec: settings.trackingIntervalSec },
      contacts: contacts.map((c) => ({ id: c.id, name: c.name, phone: c.phone, priority: c.priority, sms: c.channels.sms, live: c.channels.live && c.verified, call: c.channels.call })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, profile, demo, name, region.region]);

  // Register this phone so the safety layer can sync an SOS even with the app closed.
  useEffect(() => {
    if (!uid || !native || native.device.registered || demo) return;
    api<{ deviceId: string; deviceKey: string }>('/device/register', { label: 'Android' })
      .then((d) => {
        invoke('setDevice', { ...d, apiBase: APP_ORIGIN });
        refreshNative();
      })
      .catch(() => undefined);
  }, [uid, native, demo, refreshNative]);

  const circleAlerts = useList<SosEvent>(uid ? 'sosEvents' : null, uid ? circleAlertsQuery(uid) : undefined, [uid]) ?? [];
  const requests = useList<{ id: string; fromName: string; contactId: string }>(uid ? `users/${uid}/checkinRequests` : null, (c) => query(c, where('answered', '==', false)), [uid]) ?? [];

  // Recipient alert: open the live view from the token in the SOS text.
  useEffect(() => {
    if (screen.s !== 'alert' || !screen.arg) return;
    setAlertSos(null);
    (async () => {
      try {
        if (!(await loadConfig())) throw new Error('No connection. The SOS text has their location; live view needs internet.');
        await auth().authStateReady();
        if (!auth().currentUser) await signInAnonymously(auth());
        const j = await api<{ sosId: string }>('/track/join', { token: screen.arg });
        setAlertSos({ sosId: j.sosId });
      } catch (e) {
        setAlertSos({ error: (e as Error).message });
      }
    })();
  }, [screen]);

  const activeTrip = useMemo(() => (screen.s === 'home' ? loadTrip()?.label ?? null : null), [screen.s]);

  const fixReadiness = (w: 'location' | 'sms' | 'notifications') => {
    if (w === 'location' && native && !native.locationEnabled && native.permissions.location) return invoke('openLocationSettings');
    setDisclose(w);
  };

  const answerRequest = async (id: string, contactId: string) => {
    setScreen({ s: 'checkin', arg: contactId });
    await updateDoc(doc(db(), `users/${uid}/checkinRequests/${id}`), { answered: true, answeredAt: new Date().toISOString() }).catch(() => undefined);
  };

  const toggleDemo = (v: boolean) => {
    writeLS('shev.demo', v ? '1' : null);
    setDemo(v);
  };

  // ---------- Emergency takes over the whole screen ----------
  if (isEmergency(sos.state.phase) || sos.state.phase === 'SAFE' || sos.state.phase === 'CANCELLED') {
    return (
      <>
        {(demo || sos.state.sosId === 'DEMO') && <DemoBanner />}
        <Emergency
          sos={sos.state}
          region={region}
          contacts={contacts}
          demo={demo || sos.state.sosId === 'DEMO'}
          onEndHold={sos.requestEnd}
          onKeep={sos.keepActive}
          onResolve={sos.resolve}
          onSilence={sos.stopSound}
          onDone={() => {
            sos.reset();
            setScreen({ s: 'home' });
          }}
        />
      </>
    );
  }

  const signedOut = ready && !uid && !demo;
  return (
    <div className="min-h-screen bg-paper">
      {demo && <DemoBanner />}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-paper/90 px-4 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur">
        {screen.s === 'home' ? (
          <Logo size={32} />
        ) : (
          <button onClick={() => setScreen({ s: 'home' })} className="flex items-center gap-2 font-extrabold" aria-label="Back">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-soft">←</span>
            {TITLES[screen.s]}
          </button>
        )}
        <div className="flex items-center gap-2">
          <Pill tone={network === 'online' ? 'safe' : network === 'weak' ? 'warn' : 'neutral'}>{network === 'online' ? 'Online' : network === 'weak' ? 'Weak connection' : 'Offline'}</Pill>
          {screen.s === 'home' && (uid || demo) && (
            <button onClick={() => setScreen({ s: 'settings' })} className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-soft" aria-label="Settings">
              ⚙️
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-2">
        {!hasNative() && !demo && screen.s === 'home' && (
          <div className="mb-4 rounded-3xl border border-warn-500/30 bg-warn-50 p-4 text-sm text-ink-soft">
            <b>You&apos;re in a browser.</b> Real SOS (siren, GPS, SMS, calls, background sharing) runs in the Android app.{' '}
            <a className="font-bold text-sos-600" href="/download/Shevolution.apk">
              Get the app
            </a>{' '}
            or turn on{' '}
            <button className="font-bold text-plum underline" onClick={() => toggleDemo(true)}>
              Demo mode
            </button>
            .
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={screen.s + (screen.arg ?? '')} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.16 }}>
            {signedOut && !skip && screen.s !== 'alert' ? (
              <Welcome
                onSkip={() => {
                  writeLS('shev.skipAccount', '1');
                  setSkip(true);
                }}
                onDemo={() => toggleDemo(true)}
              />
            ) : screen.s === 'home' ? (
              <Home
                name={name}
                contacts={contacts}
                discreet={settings.discreet}
                native={native}
                network={network}
                cancelledFlash={cancelFlash}
                activeTrip={activeTrip}
                circleAlerts={circleAlerts}
                checkinRequests={requests}
                onHoldStart={() => {
                  setCancelFlash(false);
                  sos.press();
                  if (settings.vibration) invoke('vibrate', { pattern: [0, 30] });
                }}
                onHoldCancel={() => {
                  sos.release();
                  setCancelFlash(true);
                  setTimeout(() => setCancelFlash(false), 2200);
                }}
                onSos={sos.activate}
                onGo={(s, arg) => setScreen({ s, arg })}
                onAnswerRequest={answerRequest}
                onFixReadiness={fixReadiness}
              />
            ) : screen.s === 'circle' ? (
              uid ? <Circle uid={uid} contacts={contacts} region={region.region} /> : <NeedAccount />
            ) : screen.s === 'trip' || screen.s === 'timer' ? (
              <Trip kind={screen.s} contacts={contacts} region={region.region} signedIn={!!uid} demo={demo} onSos={() => setScreen({ s: 'home' })} />
            ) : screen.s === 'checkin' ? (
              <CheckIn name={name} contacts={contacts} region={region.region} signedIn={!!uid} demo={demo} initialTo={screen.arg ? [screen.arg] : undefined} />
            ) : screen.s === 'nearby' ? (
              <Nearby region={region} />
            ) : screen.s === 'fakecall' ? (
              <FakeCall />
            ) : screen.s === 'history' ? (
              uid ? <History uid={uid} /> : <NeedAccount />
            ) : screen.s === 'settings' ? (
              uid ? (
                <Settings uid={uid} profile={profile ?? null} contacts={contacts} native={native} onNativeRefresh={refreshNative} demo={demo} onDemo={toggleDemo} />
              ) : (
                <div className="space-y-4">
                  <NeedAccount />
                  <Button variant="white" className="w-full" onClick={() => toggleDemo(!demo)}>
                    {demo ? 'Turn off demo mode' : 'Turn on demo mode'}
                  </Button>
                </div>
              )
            ) : screen.s === 'watch' && screen.arg ? (
              <LiveView sosId={screen.arg} compact />
            ) : screen.s === 'alert' ? (
              alertSos?.sosId ? <LiveView sosId={alertSos.sosId} compact /> : <p className="py-10 text-center font-semibold text-ink-muted">{alertSos?.error ?? 'Opening SOS alert…'}</p>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>

      <Disclosure
        what={disclose}
        onClose={() => setDisclose(null)}
        onAllow={async (w) => {
          setDisclose(null);
          await requestPermission(w);
          refreshNative();
        }}
      />
    </div>
  );
}

function NeedAccount() {
  return (
    <div className="rounded-4xl bg-white p-5 shadow-soft">
      <SignIn intro="Sign in to keep your Safety Circle, trips and history in sync. SOS on this phone works without an account." />
    </div>
  );
}

function Welcome({ onSkip, onDemo }: { onSkip: () => void; onDemo: () => void }) {
  return (
    <div className="space-y-6 pb-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-sos-500 to-sos-700 p-6 text-white shadow-glow">
        <motion.img src="/e3d/woman-raising-hand.webp" alt="" width={120} height={120} className="absolute -bottom-2 -right-2 opacity-95" animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }} />
        <p className="text-sm font-bold text-white/80">Welcome to Shevolution</p>
        <h1 className="mt-2 max-w-[14ch] text-3xl font-extrabold leading-tight">Safety should be one hold away.</h1>
        <p className="mt-2 max-w-[24ch] text-sm text-white/85">Alert the people you trust, share your live location, and keep your journey visible.</p>
      </motion.div>
      <div className="rounded-4xl bg-white p-5 shadow-soft">
        <SignIn intro="Create an account to build your Safety Circle." />
      </div>
      <div className="grid gap-2 text-center">
        <button onClick={onSkip} className="py-2 text-sm font-bold text-ink-soft">
          Use SOS without an account for now
        </button>
        <button onClick={onDemo} className="py-2 text-sm font-bold text-plum">
          Try the demo
        </button>
      </div>
    </div>
  );
}

const DISCLOSURES = {
  location: {
    title: 'Location for SOS and trips',
    icon: '/e3d/pin.webp',
    body: 'Shevolution collects location data to enable live emergency location sharing and Safe Trips — including while the app is closed or not in use, but only during an active SOS or trip. A notification shows whenever your location is being shared. It is never used for ads or sold.',
  },
  sms: {
    title: 'Text your circle from your phone',
    icon: '/e3d/chat.webp',
    body: 'When you hold SOS, Shevolution texts your chosen contacts from your own number with your location — this works without internet. It only sends SOS, check-in and trip messages you set up; it never reads your messages.',
  },
  notifications: {
    title: 'Notifications',
    icon: '/e3d/bell.webp',
    body: 'Needed to show that your location is being shared, to remind you to check in on a trip, and to ring for SOS alerts from people who added you.',
  },
} as const;

function Disclosure({ what, onClose, onAllow }: { what: null | 'location' | 'sms' | 'notifications'; onClose: () => void; onAllow: (w: 'location' | 'sms' | 'notifications') => void }) {
  const d = what ? DISCLOSURES[what] : null;
  return (
    <Sheet open={!!d} onClose={onClose} title={d?.title}>
      {d && what && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.icon} alt="" width={64} height={64} className="mb-3" />
          <p className="text-ink-soft">{d.body}</p>
          <div className="mt-5 grid gap-2">
            <Button big onClick={() => onAllow(what)}>
              Continue
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Not now
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}
