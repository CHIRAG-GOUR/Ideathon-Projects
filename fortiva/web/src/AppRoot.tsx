'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CheckPlan, EmergencyContact, UserSettings } from '@shared/types';
import { EmergencyNumberService } from '@shared/emergency';
import { isEmergency } from '@shared/sos';
import { DEFAULT_SETTINGS, useAuthUser, useCheckPlan, useContacts, useProfile } from '@core/data';
import { hasNative, invoke, onNative } from '@core/native';
import { useNav } from '@core/useNav';
import { useReadiness } from '@core/readiness';
import { useNativeSetup } from '@core/setup';
import { useSos, type Trigger } from '@core/useSos';
import { useCheckPrompt } from '@core/checks';
import { DemoBar, cx } from '@/ui/kit';
import { Logo } from '@/ui/art';
import { Icon, type IconName } from '@/ui/icons';
import { APP_ID, BRAND, Ctx, ORIGIN, useApp, type AppCtx, type Screen } from '@/ctx';
import { ActiveSos } from '@/screens/ActiveSos';
import { Onboarding } from '@/screens/Onboarding';
import { Auth } from '@/screens/Auth';
import { Home } from '@/screens/Home';
import { CheckNetwork } from '@/screens/CheckNetwork';
import { Circle } from '@/screens/Circle';
import { EmergencyCenter } from '@/screens/EmergencyCenter';
import { Journal } from '@/screens/Journal';
import { Nearby } from '@/screens/Nearby';
import { History } from '@/screens/History';
import { Privacy } from '@/screens/Privacy';
import { Settings } from '@/screens/Settings';

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
  { id: 'demo-1', name: 'Mom (demo)', phone: '+910000000001', email: null, role: 'primary', relationship: 'Mother', channels: { sms: true, whatsapp: true, email: false, live: true }, createdAt: '' },
  { id: 'demo-2', name: 'Ravi (demo)', phone: '+910000000002', email: null, role: 'family', relationship: 'Brother', channels: { sms: true, whatsapp: true, email: false, live: true }, createdAt: '' },
  { id: 'demo-3', name: 'Anu (demo)', phone: '+910000000003', email: null, role: 'friend', relationship: 'Flatmate', channels: { sms: true, whatsapp: false, email: false, live: true }, createdAt: '' },
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

  // Safety Check Network plan: the phone's own copy first (works offline), else the cloud copy.
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

  // Opened from a check-in notification → straight to the Check Network.
  useEffect(() => {
    if (!hasNative()) return;
    const open = () => {
      const r = invoke<{ screen: string | null }>('consumeLaunch');
      if (r.ok && r.screen === 'checks') nav.go('checks');
    };
    open();
    return onNative((e) => e.type === 'resume' && open());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AppCtx = { uid, user, profile, settings, contacts, contactsLoaded: demo || cloudContacts !== undefined, demo, setDemo, region, nav, sos, startSos, readiness, plan, setLocalPlan, toast };

  if (!onboarded) return <Onboarding onDone={() => (store('onboarded', '1'), setOnboarded(true))} />;
  if (!ready) return <main className="grid min-h-screen place-items-center bg-mesh"><Logo size={56} /></main>;
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
  { s: 'checks', label: 'Check-ins', icon: 'clock' },
  { s: 'circle', label: 'Circle', icon: 'network' },
  { s: 'journal', label: 'Journal', icon: 'book' },
  { s: 'nearby', label: 'Nearby', icon: 'pin' },
  { s: 'history', label: 'History', icon: 'refresh' },
  { s: 'settings', label: 'Settings', icon: 'gear' },
];
const MOBILE: Screen[] = ['home', 'checks', 'circle', 'settings'];

function Shell({ toast }: { toast: string | null }) {
  const { nav, demo } = useApp();
  const screens: Record<Screen, JSX.Element> = {
    home: <Home />, checks: <CheckNetwork />, circle: <Circle />, emergency: <EmergencyCenter />, journal: <Journal />, nearby: <Nearby />, history: <History />, privacy: <Privacy />, settings: <Settings />,
  };
  const mob = NAV.filter((n) => MOBILE.includes(n.s));
  return (
    <div className="min-h-screen bg-mesh">
      {demo && <DemoBar />}
      {/* Desktop: top navigation */}
      <header className="glass sticky top-0 z-30 hidden border-b border-white/70 lg:block">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <button onClick={() => nav.tab('home')}><Logo /></button>
          <nav className="flex flex-1 gap-1" aria-label="Main">
            {NAV.map((n) => (
              <button key={n.s} onClick={() => nav.tab(n.s)} aria-current={nav.screen === n.s ? 'page' : undefined} className={cx('relative rounded-full px-3.5 py-2 text-sm font-semibold transition-colors', nav.screen === n.s ? 'text-cobalt-700' : 'text-ink-muted hover:text-ink')}>
                {nav.screen === n.s && <motion.span layoutId="topnav" className="absolute inset-0 rounded-full bg-cobalt-50" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <span className="relative">{n.label}</span>
              </button>
            ))}
          </nav>
          <button onClick={() => nav.tab('emergency')} className="inline-flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-bold text-white shadow-coral hover:bg-coral-600">
            <Icon name="alert" size={18} /> Emergency
          </button>
        </div>
      </header>
      <main className="pb-32 lg:pb-12">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={nav.screen} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            {screens[nav.screen]}
          </motion.div>
        </AnimatePresence>
      </main>
      {/* Mobile: bottom bar with a raised Emergency button in the middle */}
      <nav className="glass fixed inset-x-3 bottom-3 z-30 rounded-full border border-white/80 shadow-soft lg:hidden" style={{ marginBottom: 'env(safe-area-inset-bottom)' }} aria-label="Main">
        <div className="grid grid-cols-5 items-center">
          {[mob[0], mob[1], null, mob[2], mob[3]].map((n) =>
            n ? (
              <button key={n.s} onClick={() => nav.tab(n.s)} aria-current={nav.screen === n.s ? 'page' : undefined} className={cx('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold', nav.screen === n.s ? 'text-cobalt-700' : 'text-ink-muted')}>
                <Icon name={n.icon} />
                {n.label}
              </button>
            ) : (
              <button key="sos" onClick={() => nav.tab('emergency')} aria-label="Emergency Center" className="mx-auto -mt-7 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-coral-400 to-coral-600 text-sm font-bold text-white shadow-coral ring-4 ring-paper">
                SOS
              </button>
            ),
          )}
        </div>
      </nav>
      <AnimatePresence>
        {toast && (
          <motion.div role="status" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="fixed inset-x-4 bottom-28 z-50 mx-auto max-w-md rounded-3xl bg-ink px-5 py-3 text-sm font-medium text-white shadow-2xl lg:bottom-8">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
