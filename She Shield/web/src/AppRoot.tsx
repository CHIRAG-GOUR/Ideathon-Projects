'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { addDoc, collection } from 'firebase/firestore';
import type { CheckPlan, EmergencyContact, EmergencyLocation, UserSettings } from '@shared/types';
import { EmergencyNumberService } from '@shared/emergency';
import { isEmergency } from '@shared/sos';
import { DEFAULT_SETTINGS, useAuthUser, useCheckPlan, useContacts, useProfile } from '@core/data';
import { db } from '@core/firebase';
import { hasNative, invoke, onNative } from '@core/native';
import { useNav } from '@core/useNav';
import { useReadiness } from '@core/readiness';
import { useNativeSetup } from '@core/setup';
import { useSos, type Trigger } from '@core/useSos';
import { useCheckPrompt } from '@core/checks';
import { DemoBar, cx } from '@/ui/kit';
import { Logo } from '@/ui/art';
import { Emergency } from '@/screens/Emergency';
import { Onboarding } from '@/screens/Onboarding';
import { Auth } from '@/screens/Auth';
import { Home } from '@/screens/Home';
import { ShieldMode } from '@/screens/ShieldMode';
import { Contacts } from '@/screens/Contacts';
import { Readiness } from '@/screens/Readiness';
import { Nearby } from '@/screens/Nearby';
import { History } from '@/screens/History';
import { Vault } from '@/screens/Vault';
import { Privacy } from '@/screens/Privacy';
import { Settings } from '@/screens/Settings';
import { Icon, type IconName } from '@/ui/icons';
import { APP_ID, BRAND, Ctx, ORIGIN, useApp, type AppCtx, type Screen } from '@/ctx';

const K = (k: string) => `${APP_ID}.${k}`;


const DEMO_CONTACTS: EmergencyContact[] = [
  { id: 'demo-1', name: 'Asha (demo)', phone: '+910000000001', email: null, role: 'primary', relationship: 'Sister', channels: { sms: true, whatsapp: true, email: false, live: true }, createdAt: '' },
  { id: 'demo-2', name: 'Meera (demo)', phone: '+910000000002', email: null, role: 'friend', relationship: 'Friend', channels: { sms: true, whatsapp: true, email: false, live: true }, createdAt: '' },
];

function store(k: string, v?: string | null) {
  try {
    if (v === undefined) return localStorage.getItem(K(k));
    if (v === null) localStorage.removeItem(K(k));
    else localStorage.setItem(K(k), v);
  } catch {
    /* storage blocked */
  }
  return null;
}

export default function AppRoot() {
  const [onboarded, setOnboarded] = useState(() => store('onboarded') === '1');
  const [demo, setDemoState] = useState(() => store('demo') === '1');
  const { user, ready } = useAuthUser();
  const uid = demo ? null : user?.uid ?? null;
  const profile = useProfile(uid);
  const cloudContacts = useContacts(uid);
  const contacts = demo ? DEMO_CONTACTS : cloudContacts ?? [];
  const settings: UserSettings = { ...DEFAULT_SETTINGS, ...profile?.settings };
  const readiness = useReadiness(contacts.length);
  const region = EmergencyNumberService.forRegion(settings.region || readiness.native?.region);
  const nav = useNav<Screen>('home');
  const [toastMsg, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const toast = useCallback((m: string) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }, []);

  const setDemo = (v: boolean) => {
    store('demo', v ? '1' : null);
    setDemoState(v);
    nav.tab('home');
  };

  useNativeSetup({ brand: BRAND, origin: ORIGIN, user: demo ? null : user, profile, contacts, native: readiness.native, demo, onRegistered: readiness.refresh });

  // ---- SOS ----
  const sos = useSos({ appId: APP_ID, brand: BRAND, origin: ORIGIN, demo, contacts, userName: profile?.name || user?.displayName || 'Me', region: region.region, sound: settings.sound, vibration: settings.vibration });
  const [trigger, setTrigger] = useState<Trigger>(() => (store('trigger') as Trigger) || 'sos');
  const startSos = useCallback(
    (t: Trigger) => {
      setTrigger(t);
      store('trigger', t);
      sos.activate(t);
    },
    [sos],
  );
  useEffect(() => {
    if (!hasNative()) return;
    const s = invoke<{ trigger?: Trigger; active?: boolean }>('sosState');
    if (s.ok && s.active && s.trigger) setTrigger(s.trigger);
    return onNative((e) => {
      if (e.type === 'sos_activated') setTrigger((e.trigger as Trigger) || 'sos');
      if (e.type === 'discreet_trigger') setTrigger('discreet');
    });
  }, []);

  // ---- Shield Mode: Android keeps a protective foreground service with a warm GPS fix; a browser keeps watching position. ----
  const [since, setSince] = useState<string | null>(() => store('shieldSince'));
  const [fix, setFix] = useState<EmergencyLocation | null>(null);
  const shieldOn = hasNative() ? !!readiness.native?.standby : !!since;
  const setShield = useCallback(
    (on: boolean) => {
      if (hasNative() && !demo) {
        invoke('standby', { on });
        setTimeout(readiness.refresh, 300);
      }
      const at = new Date().toISOString();
      setSince(on ? at : null);
      store('shieldSince', on ? at : null);
      if (uid && !demo) addDoc(collection(db(), `users/${uid}/shieldLog`), { type: on ? 'on' : 'off', at }).catch(() => undefined);
      toast(on ? 'Shield Mode on — location kept ready for an instant SOS.' : 'Shield Mode off.');
    },
    [demo, uid, readiness.refresh, toast],
  );
  useEffect(() => {
    if (!shieldOn || hasNative() || !('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setFix({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy, altitude: null, speed: p.coords.speed, heading: p.coords.heading, timestamp: new Date(p.timestamp).toISOString(), provider: 'browser' }),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [shieldOn]);
  useEffect(() => {
    if (!shieldOn || !hasNative()) return;
    invoke('location', {});
    return onNative((e) => e.type === 'location' && setFix(e.location));
  }, [shieldOn]);

  // ---- Protection Check plan: the phone's own copy first (works offline), else the cloud copy ----
  const cloudPlan = useCheckPlan(uid);
  const [nativePlan, setNativePlan] = useState<CheckPlan | null | undefined>(undefined);
  const [demoPlan, setDemoPlan] = useState<CheckPlan | null>(null);
  useEffect(() => {
    if (!hasNative()) return;
    const read = () => {
      const r = invoke<{ plan: CheckPlan | null }>('checkState');
      if (r.ok) setNativePlan(r.plan);
    };
    read();
    const off = onNative((e) => (e.type === 'check_state' || e.type === 'resume') && read());
    const t = setInterval(read, 15_000);
    return () => {
      off();
      clearInterval(t);
    };
  }, []);
  const plan = demo ? demoPlan : hasNative() ? nativePlan ?? cloudPlan : cloudPlan;
  useCheckPrompt(plan, BRAND);
  const setLocalPlan = (p: CheckPlan | null) => (demo ? setDemoPlan(p) : hasNative() ? setNativePlan(p) : undefined);

  // Opened from a notification (e.g. "Are you safe?") → straight to Shield Mode.
  useEffect(() => {
    if (!hasNative()) return;
    const r = invoke<{ screen: string | null }>('consumeLaunch');
    if (r.ok && r.screen === 'checks') nav.go('shield');
    return onNative((e) => {
      if (e.type !== 'resume') return;
      const x = invoke<{ screen: string | null }>('consumeLaunch');
      if (x.ok && x.screen === 'checks') nav.go('shield');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AppCtx = {
    uid, user, profile, settings, contacts, contactsLoaded: demo || cloudContacts !== undefined, demo, setDemo, region, nav, sos, startSos, readiness,
    shield: { on: shieldOn, since, fix, set: setShield }, plan, setLocalPlan, toast,
  };

  if (!onboarded) return <Onboarding onDone={() => (store('onboarded', '1'), setOnboarded(true))} />;
  if (!ready) return <Splash />;
  if (!user && !demo) return <Auth onDemo={() => setDemo(true)} region={region} />;

  const phase = sos.state.phase;
  if (isEmergency(phase) || phase === 'SAFE' || phase === 'CANCELLED')
    return (
      <Ctx.Provider value={value}>
        {demo && <DemoBar />}
        <Emergency
          sos={sos.state}
          trigger={trigger}
          region={region}
          contacts={contacts}
          demo={demo}
          messageFor={sos.messageFor}
          onEndHold={sos.requestEnd}
          onKeep={sos.keepActive}
          onResolve={sos.resolve}
          onSilence={sos.stopSound}
          onDone={() => {
            sos.reset();
            store('trigger', null);
            nav.tab('home');
          }}
        />
      </Ctx.Provider>
    );

  return (
    <Ctx.Provider value={value}>
      <Shell toast={toastMsg} />
    </Ctx.Provider>
  );
}

function Splash() {
  return (
    <main className="grid min-h-screen place-items-center bg-pearl">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <Logo size={56} />
      </motion.div>
    </main>
  );
}

const TABS: { s: Screen; label: string; icon: IconName }[] = [
  { s: 'home', label: 'Home', icon: 'home' },
  { s: 'shield', label: 'Shield', icon: 'shield' },
  { s: 'contacts', label: 'Contacts', icon: 'people' },
  { s: 'history', label: 'History', icon: 'clock' },
  { s: 'settings', label: 'Settings', icon: 'gear' },
];
const MORE: { s: Screen; label: string; icon: IconName }[] = [
  { s: 'ready', label: 'Readiness', icon: 'check' },
  { s: 'nearby', label: 'Nearby help', icon: 'pin' },
  { s: 'vault', label: 'Evidence vault', icon: 'vault' },
  { s: 'privacy', label: 'Privacy', icon: 'lock' },
];

function Shell({ toast }: { toast: string | null }) {
  const { nav, demo, shield } = useApp();
  const screens: Record<Screen, JSX.Element> = {
    home: <Home />, shield: <ShieldMode />, contacts: <Contacts />, ready: <Readiness />, nearby: <Nearby />, history: <History />, vault: <Vault />, privacy: <Privacy />, settings: <Settings />,
  };
  const tabOf = (s: Screen) => (TABS.some((t) => t.s === s) ? s : nav.screen === s ? s : null);
  return (
    <div className="min-h-screen bg-pearl bg-weave lg:flex">
      {demo && <div className="fixed inset-x-0 top-0 z-40"><DemoBar /></div>}
      <aside className={cx('sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-white/80 px-4 py-6 backdrop-blur lg:flex', demo && 'pt-12')}>
        <Logo />
        <p className="mt-1 pl-1 text-xs font-semibold text-ink-muted">{shield.on ? 'Shield Mode is on' : 'Protection ready'}</p>
        <nav className="mt-8 space-y-1" aria-label="Main">
          {[...TABS, ...MORE].map((t) => (
            <button key={t.s} onClick={() => nav.tab(t.s)} aria-current={nav.screen === t.s ? 'page' : undefined} className={cx('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[15px] font-bold transition-colors', nav.screen === t.s ? 'bg-violet-800 text-white' : 'text-ink-soft hover:bg-violet-50')}>
              <Icon name={t.icon} />
              {t.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className={cx('min-w-0 flex-1 pb-28 lg:pb-10', demo && 'pt-7')}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={nav.screen} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
            {screens[nav.screen]}
          </motion.div>
        </AnimatePresence>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Main">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map((t) => {
            const on = tabOf(nav.screen) === t.s || (nav.depth > 1 && t.s === 'home' && !TABS.some((x) => x.s === nav.screen));
            return (
              <button key={t.s} onClick={() => nav.tab(t.s)} aria-current={on ? 'page' : undefined} className={cx('relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold', on ? 'text-violet-800' : 'text-ink-muted')}>
                {on && <motion.span layoutId="tab" className="absolute inset-x-4 top-0 h-[3px] rounded-full bg-violet-600" />}
                <Icon name={t.icon} />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
      <AnimatePresence>
        {toast && (
          <motion.div role="status" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-2xl lg:bottom-8">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

