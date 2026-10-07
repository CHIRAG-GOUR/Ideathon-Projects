'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { doc, setDoc } from 'firebase/firestore';
import type { EmergencyContact, UserSettings } from '@shared/types';
import { EmergencyNumberService } from '@shared/emergency';
import { isEmergency } from '@shared/sos';
import { DEFAULT_SETTINGS, useAuthUser, useContacts, useDoc, useProfile } from '@core/data';
import { db } from '@core/firebase';
import { currentFix } from '@core/native';
import { useNav } from '@core/useNav';
import { useReadiness } from '@core/readiness';
import { useNativeSetup } from '@core/setup';
import { useSos, type Trigger } from '@core/useSos';
import { APP_ID, BRAND, Ctx, ORIGIN, type AppCtx, type Screen } from '@/ctx';
import { useMedical } from '@/services/health/vault';
import { DEFAULT_PREFS, serviceLines, type Prefs } from '@/services/emergency/numbers';
import { DEMO_FIX, demoRadar, useNow, useRealRadar, type Fix } from '@/services/georadar/radar';
import { Mark } from '@/ui/brand';
import { LifeLineShell } from '@/components/lifeline/LifeLineShell';
import { EmergencyCommandCenter } from '@/components/lifeline/EmergencyCommandCenter';
import { Onboarding } from '@/screens/Onboarding';
import { Auth } from '@/screens/Auth';

const K = (k: string) => `${APP_ID}.${k}`;
export function store(k: string, v?: string | null) {
  try {
    if (v === undefined) return localStorage.getItem(K(k));
    if (v === null) localStorage.removeItem(K(k));
    else localStorage.setItem(K(k), v);
  } catch {
    /* storage blocked */
  }
  return null;
}

export const DEMO_USER = 'Arjun Sharma';
const DEMO_CONTACTS: EmergencyContact[] = [
  { id: 'demo-mom', name: 'Demo Mom', phone: '+910000000001', email: null, role: 'primary', relationship: 'Mother', channels: { sms: true, whatsapp: true, email: false, live: true }, createdAt: '' },
  { id: 'demo-dad', name: 'Demo Dad', phone: '+910000000002', email: null, role: 'family', relationship: 'Father', channels: { sms: true, whatsapp: true, email: false, live: true }, createdAt: '' },
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
  const medical = useMedical(uid, demo);

  // preferences (emergency numbers, vault link behaviour, voice guidance)
  const cloudPrefs = useDoc<Prefs>(uid ? `users/${uid}/prefs/main` : null);
  const [localPrefs, setLocalPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const prefs: Prefs = demo ? localPrefs : { ...DEFAULT_PREFS, ...cloudPrefs };
  const savePrefs = useCallback(async (p: Partial<Prefs>) => {
    if (demo || !uid) return setLocalPrefs((x) => ({ ...x, ...p }));
    const next = { ...DEFAULT_PREFS, ...cloudPrefs, ...p, updatedAt: new Date().toISOString() };
    await setDoc(doc(db(), `users/${uid}/prefs/main`), next);
  }, [demo, uid, cloudPrefs]);
  const lines = useMemo(() => serviceLines(region, prefs), [region, prefs]);

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

  const userName = demo ? DEMO_USER : profile?.name || user?.displayName || 'Me';
  const sos = useSos({ appId: APP_ID, brand: BRAND, origin: ORIGIN, demo, contacts, userName, region: region.region, sound: settings.sound, vibration: settings.vibration });
  const startSos = useCallback((t: Trigger) => sos.activate(t), [sos]);

  // location: demo uses a fixed demo location; otherwise the phone's GPS when permission is already granted,
  // or after the user taps "Enable location" — never prompting on first paint.
  const [fix, setFix] = useState<Fix | null>(demo ? DEMO_FIX : null);
  const [locState, setLocState] = useState<AppCtx['locState']>(demo ? 'ok' : 'idle');
  const locate = useCallback(async () => {
    if (demo) return;
    setLocState('locating');
    const f = await currentFix().catch(() => null);
    if (f) {
      setFix({ latitude: f.latitude, longitude: f.longitude, accuracy: f.accuracy });
      setLocState('ok');
    } else setLocState(readiness.items.find((i) => i.key === 'location')?.state === 'off' ? 'denied' : 'error');
  }, [demo, readiness.items]);
  useEffect(() => {
    if (demo) { setFix(DEMO_FIX); setLocState('ok'); return; }
    setFix(null);
    setLocState('idle');
    const loc = readiness.items.find((i) => i.key === 'location');
    if (loc?.state === 'ok') void locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);
  useEffect(() => {
    const l = sos.state.location;
    if (l && !demo) { setFix({ latitude: l.latitude, longitude: l.longitude, accuracy: l.accuracy }); setLocState('ok'); }
  }, [sos.state.location, demo]);

  const real = useRealRadar(fix, !demo);
  const now = useNow(1000, demo);
  const radar = demo ? { points: demoRadar(DEMO_FIX, sos.state.startedAt && isEmergency(sos.state.phase) ? sos.state.startedAt : null, now), error: null, live: false } : { ...real, live: true };

  const [online, setOnline] = useState(true);
  useEffect(() => {
    const up = () => setOnline(navigator.onLine);
    up();
    window.addEventListener('online', up);
    window.addEventListener('offline', up);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', up); };
  }, []);

  const phase = sos.state.phase;
  const emergency = isEmergency(phase);
  const value: AppCtx = {
    uid, user, profile, settings, contacts, contactsLoaded: demo || cloudContacts !== undefined, demo, setDemo, region, nav, sos, startSos, readiness, toast,
    medical, prefs, savePrefs, lines, fix, locState, locate, radar, online, emergency,
  };

  if (!onboarded) return <Onboarding onDone={() => (store('onboarded', '1'), setOnboarded(true))} />;
  if (!ready) return <main className="grid min-h-screen place-items-center surface-command"><motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.4, repeat: Infinity }}><Mark size={64} /></motion.div></main>;
  if (!user && !demo) return <Auth onDemo={() => setDemo(true)} region={region} />;

  const showCommand = emergency || phase === 'SAFE' || phase === 'CANCELLED';
  return (
    <Ctx.Provider value={value}>
      {showCommand ? (
        <motion.div key="command" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <EmergencyCommandCenter onDone={() => { sos.reset(); nav.tab('home'); }} />
        </motion.div>
      ) : (
        <LifeLineShell />
      )}
      <AnimatePresence>
        {toastMsg && (
          <motion.div role="status" initial={{ y: 30, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 32 }} className="fixed inset-x-4 bottom-28 z-[80] mx-auto max-w-md rounded-2xl bg-midnight-900 px-4 py-3 text-[14px] font-medium text-white shadow-lift ring-1 ring-cyan-400/20 lg:bottom-8">
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
