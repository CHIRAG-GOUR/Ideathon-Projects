'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { EmergencyContact, UserSettings } from '@shared/types';
import { EmergencyNumberService } from '@shared/emergency';
import { fillMessage, fmtTime } from '@shared/message';
import { isEmergency } from '@shared/sos';
import { DEFAULT_SETTINGS, useAuthUser, useContacts, useProfile } from '@core/data';
import { currentFix, dial, hasNative, invoke, onNative, openWhatsApp, smsUrl } from '@core/native';
import { useNav } from '@core/useNav';
import { useReadiness } from '@core/readiness';
import { useNativeSetup } from '@core/setup';
import { useSos, type Trigger } from '@core/useSos';
import { DemoBar, cx } from '@/ui/kit';
import { Logo } from '@/ui/art';
import { Icon, type IconName } from '@/ui/icons';
import { INDIA_LINES, type Action, type Line } from '@/content';
import { APP_ID, BRAND, Ctx, ORIGIN, useApp, type AppCtx, type Screen } from '@/ctx';
import { ActiveSos } from '@/screens/ActiveSos';
import { Onboarding } from '@/screens/Onboarding';
import { Auth } from '@/screens/Auth';
import { Home } from '@/screens/Home';
import { Toolkit } from '@/screens/Toolkit';
import { PlaybookView } from '@/screens/Playbook';
import { QuickActions } from '@/screens/QuickActions';
import { SosScreen } from '@/screens/SosScreen';
import { Contacts } from '@/screens/Contacts';
import { Nearby } from '@/screens/Nearby';
import { History } from '@/screens/History';
import { Settings } from '@/screens/Settings';
import { Privacy } from '@/screens/Privacy';

const K = (k: string) => `${APP_ID}.${k}`;
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

const DEMO_CONTACTS: EmergencyContact[] = [
  { id: 'demo-1', name: 'Didi (demo)', phone: '+910000000001', email: null, role: 'primary', relationship: 'Sister', channels: { sms: true, whatsapp: true, email: false, live: true }, createdAt: '' },
  { id: 'demo-2', name: 'Kavya (demo)', phone: '+910000000002', email: null, role: 'friend', relationship: 'Friend', channels: { sms: true, whatsapp: true, email: false, live: true }, createdAt: '' },
];

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
    return onNative((e) => e.type === 'sos_activated' && setTrigger((e.trigger as Trigger) || 'sos'));
  }, []);

  // Helplines resolve to the user's region; India-specific lines fall back to the regional emergency number elsewhere.
  const lineNumber = (l: Line) => (l === 'emergency' || region.region !== 'IN' ? { number: region.primary.number, label: region.primary.label } : INDIA_LINES[l]);
  const primary = contacts.find((c) => c.role === 'primary' && c.phone) ?? contacts.find((c) => c.phone);

  const run = async (a: Action) => {
    if (a.kind === 'sos') return startSos('sos');
    if (a.kind === 'silent') return startSos('discreet');
    if (a.kind === 'nearby') return nav.go('nearby');
    if (a.kind === 'call') return demo ? toast(`Demo — would call ${lineNumber(a.line).number}.`) : dial(lineNumber(a.line).number);
    if (!primary) {
      toast('Add a trusted contact first.');
      return nav.go('contacts');
    }
    if (a.kind === 'callTrusted') return demo ? toast(`Demo — would call ${primary.name}.`) : dial(primary.phone!);
    // share: one message with where you are right now, sent from your own WhatsApp or Messages (you tap Send).
    toast('Getting your location…');
    const fix = await currentFix().catch(() => null);
    if (!fix) return toast('Location unavailable. Turn on location and try again.');
    const text = fillMessage('📍 {name} shared their location with you via {brand}.\n{locline}\n{coords}\n🕒 {time}', { brand: BRAND, name: profile?.name || user?.displayName || 'Me', location: fix, time: fmtTime(fix.timestamp, region.timeZone), emergency: region.primary.number, liveUrl: null });
    if (demo) return toast('Demo — location found, nothing was sent.');
    if (primary.channels.whatsapp) openWhatsApp(primary.phone!, text);
    else location.href = smsUrl([primary.phone!], text);
  };

  const value: AppCtx = { uid, user, profile, settings, contacts, contactsLoaded: demo || cloudContacts !== undefined, demo, setDemo, region, nav, sos, startSos, readiness, run, lineNumber, toast };

  if (!onboarded) return <Onboarding onDone={() => (store('onboarded', '1'), setOnboarded(true))} />;
  if (!ready) return <main className="grid min-h-screen place-items-center bg-geo"><Logo size={56} /></main>;
  if (!user && !demo) return <Auth onDemo={() => setDemo(true)} region={region} />;

  const phase = sos.state.phase;
  if (isEmergency(phase) || phase === 'SAFE' || phase === 'CANCELLED')
    return (
      <Ctx.Provider value={value}>
        {demo && <DemoBar />}
        <ActiveSos
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

const NAV: { s: Screen; label: string; icon: IconName }[] = [
  { s: 'home', label: 'Home', icon: 'home' },
  { s: 'toolkit', label: 'Toolkit', icon: 'grid' },
  { s: 'actions', label: 'Actions', icon: 'bolt' },
  { s: 'contacts', label: 'Contacts', icon: 'people' },
  { s: 'nearby', label: 'Nearby', icon: 'pin' },
  { s: 'history', label: 'History', icon: 'clock' },
  { s: 'settings', label: 'Settings', icon: 'gear' },
];
const MOBILE: Screen[] = ['home', 'toolkit', 'actions', 'contacts', 'settings'];

function Shell({ toast }: { toast: string | null }) {
  const { nav, demo } = useApp();
  const screens: Record<Screen, JSX.Element> = {
    home: <Home />, toolkit: <Toolkit />, playbook: <PlaybookView />, actions: <QuickActions />, sos: <SosScreen />, contacts: <Contacts />, nearby: <Nearby />, history: <History />, settings: <Settings />, privacy: <Privacy />,
  };
  const active = (s: Screen) => nav.screen === s || (s === 'toolkit' && nav.screen === 'playbook');
  return (
    <div className="min-h-screen bg-geo lg:flex">
      {demo && <div className="fixed inset-x-0 top-0 z-40"><DemoBar /></div>}
      {/* Desktop: compact indigo rail */}
      <aside className={cx('sticky top-0 hidden h-screen w-24 shrink-0 flex-col items-center gap-2 bg-indigo-700 py-6 lg:flex', demo && 'pt-12')}>
        <Logo word={false} size={40} />
        <nav className="mt-6 flex flex-col gap-1.5" aria-label="Main">
          {NAV.map((n) => (
            <button key={n.s} onClick={() => nav.tab(n.s)} aria-current={active(n.s) ? 'page' : undefined} className={cx('flex w-20 flex-col items-center gap-1 rounded-2xl py-2.5 text-[11px] font-semibold transition-colors', active(n.s) ? 'bg-tang-400 text-indigo-900' : 'text-indigo-100 hover:bg-indigo-600')}>
              <Icon name={n.icon} />
              {n.label}
            </button>
          ))}
        </nav>
        <button onClick={() => nav.tab('sos')} className="mt-auto grid h-16 w-16 place-items-center rounded-2xl bg-sos-500 font-display text-sm font-extrabold text-white shadow-sos">SOS</button>
      </aside>
      <div className={cx('min-w-0 flex-1 pb-28 lg:pb-12', demo && 'pt-7')}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={nav.screen + (nav.arg ?? '')} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}>
            {screens[nav.screen]}
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Mobile: indigo tab bar + SOS badge */}
      <button onClick={() => nav.tab('sos')} aria-label="SOS" className="fixed bottom-[calc(5.2rem+env(safe-area-inset-bottom))] right-4 z-30 grid h-14 w-14 place-items-center rounded-2xl border-b-4 border-sos-700 bg-sos-500 font-display text-sm font-extrabold text-white shadow-sos lg:hidden">SOS</button>
      <nav className="fixed inset-x-0 bottom-0 z-30 bg-indigo-700 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Main">
        <div className="mx-auto grid max-w-lg grid-cols-5 px-1">
          {NAV.filter((n) => MOBILE.includes(n.s)).map((n) => (
            <button key={n.s} onClick={() => nav.tab(n.s)} aria-current={active(n.s) ? 'page' : undefined} className="relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold">
              {active(n.s) && <motion.span layoutId="wtab" className="absolute inset-x-2 inset-y-1.5 rounded-2xl bg-tang-400" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              <span className={cx('relative flex flex-col items-center gap-1', active(n.s) ? 'text-indigo-900' : 'text-indigo-100')}>
                <Icon name={n.icon} />
                {n.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
      <AnimatePresence>
        {toast && (
          <motion.div role="status" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="fixed inset-x-4 bottom-36 z-50 mx-auto max-w-md rounded-2xl border-2 border-indigo-900 bg-tang-300 px-4 py-3 text-sm font-semibold text-indigo-900 shadow-tile lg:bottom-8">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
