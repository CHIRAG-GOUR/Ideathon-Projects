import { lazy, Suspense, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRoute, go, type Route } from './hooks/useRoute';
import { main } from './simulation/controller';
import { useSim } from './simulation/useSim';
import { safetyTone, SAFETY_TEXT } from './safety/labels';
import { settings, useSettings } from './services/settings';
import { useAuth } from './firebase/auth';
import { Logo, IconChart, IconCompare, IconCube, IconDashboard, IconGear, IconList, IconPresent, IconSim, IconSound } from './assets/art';
import { Status, cx } from './components/ui';
import { Dashboard } from './screens/Dashboard';

const Simulation = lazy(() => import('./screens/Simulation'));
const Compare = lazy(() => import('./screens/Compare'));
const SmartDock = lazy(() => import('./screens/SmartDock'));
const Telemetry = lazy(() => import('./screens/Telemetry'));
const Events = lazy(() => import('./screens/Events'));
const Presentation = lazy(() => import('./screens/Presentation'));
const Settings = lazy(() => import('./screens/Settings'));

const NAV: { r: Route; label: string; icon: ReactNode; mobile?: boolean }[] = [
  { r: 'dashboard', label: 'Dashboard', icon: <IconDashboard />, mobile: true },
  { r: 'simulation', label: 'Simulation', icon: <IconSim />, mobile: true },
  { r: 'compare', label: 'Compare', icon: <IconCompare />, mobile: true },
  { r: 'dock', label: 'Smart Dock', icon: <IconCube />, mobile: true },
  { r: 'telemetry', label: 'Telemetry', icon: <IconChart /> },
  { r: 'events', label: 'Events', icon: <IconList /> },
  { r: 'present', label: 'Presentation', icon: <IconPresent /> },
  { r: 'settings', label: 'Settings', icon: <IconGear /> },
];

export function App() {
  const { route, params } = useRoute();
  const s = useSim(main, 6);
  const st = useSettings();
  const auth = useAuth();
  const present = route === 'present';

  const screen = (() => {
    switch (route) {
      case 'simulation': return <Simulation params={params} />;
      case 'compare': return <Compare params={params} />;
      case 'dock': return <SmartDock />;
      case 'telemetry': return <Telemetry />;
      case 'events': return <Events />;
      case 'present': return <Presentation params={params} />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  })();

  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      {/* Desktop sidebar */}
      {!present && (
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-white/70 px-4 py-5 backdrop-blur lg:flex">
          <Logo />
          <nav className="mt-7 space-y-1" aria-label="Main">
            {NAV.map((n) => (
              <button key={n.r} onClick={() => go(n.r)} aria-current={route === n.r ? 'page' : undefined} className={cx('relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-bold transition-colors', route === n.r ? 'text-white' : 'text-graphite-soft hover:bg-cream-100')}>
                {route === n.r && <motion.span layoutId="nav" className="absolute inset-0 rounded-xl bg-lpg-600" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <span className="relative">{n.icon}</span>
                <span className="relative">{n.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-3 rounded-xl2 bg-cream-100 p-3 ring-1 ring-line">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-graphite-muted">Live dock · simulation</p>
            <Status tone={safetyTone(s.safety)} pulse={s.alarm !== 'none'}>{SAFETY_TEXT[s.safety]}</Status>
            <p className="text-[11px] text-graphite-muted">{auth.user ? `Signed in · ${auth.user.email ?? 'account'}` : 'DEMO MODE · not signed in'}</p>
          </div>
        </aside>
      )}

      <div className="min-w-0 flex-1">
        {/* Compact action bar */}
        {!present && (
          <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-cream/90 px-4 py-2.5 backdrop-blur lg:hidden">
            <Logo size={30} />
            <div className="flex items-center gap-2">
              <Status tone={safetyTone(s.safety)} pulse={s.alarm !== 'none'}>{SAFETY_TEXT[s.safety]}</Status>
              <button onClick={() => settings.set({ muted: !st.muted })} aria-label={st.muted ? 'Unmute sounds' : 'Mute sounds'} className="grid h-9 w-9 place-items-center rounded-lg text-graphite-soft hover:bg-cream-100">
                <IconSound muted={st.muted} size={20} />
              </button>
            </div>
          </header>
        )}
        <main id="main" className={cx(present ? '' : 'mx-auto max-w-[1500px] px-4 pb-28 pt-4 sm:px-6 lg:pb-10 lg:pt-6')}>
          {!present && (
            <div className="mb-3 hidden items-center justify-end gap-2 lg:flex">
              <span className="rounded-md bg-graphite px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-white">CONCEPT / PROTOTYPE · ALL TELEMETRY SIMULATED</span>
              <button onClick={() => settings.set({ muted: !st.muted })} aria-label={st.muted ? 'Unmute sounds' : 'Mute sounds'} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-bold text-graphite-soft hover:bg-cream-100">
                <IconSound muted={st.muted} size={18} />
                {st.muted ? 'Muted' : 'Sound on'}
              </button>
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={route} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
              <Suspense fallback={<p className="p-8 text-graphite-muted">Loading…</p>}>{screen}</Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      {!present && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Main">
          <div className="mx-auto grid max-w-xl grid-cols-5">
            {NAV.filter((n) => n.mobile).map((n) => (
              <button key={n.r} onClick={() => go(n.r)} aria-current={route === n.r ? 'page' : undefined} className={cx('flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-bold', route === n.r ? 'text-lpg-700' : 'text-graphite-muted')}>
                {n.icon}
                {n.label}
              </button>
            ))}
            <MoreMenu route={route} />
          </div>
        </nav>
      )}
    </div>
  );
}

function MoreMenu({ route }: { route: Route }) {
  const more = NAV.filter((n) => !n.mobile);
  const active = more.some((n) => n.r === route);
  return (
    <details className="group relative">
      <summary className={cx('flex cursor-pointer list-none flex-col items-center gap-0.5 py-2 text-[10.5px] font-bold', active ? 'text-lpg-700' : 'text-graphite-muted')} aria-label="More screens">
        <IconList />
        More
      </summary>
      <div className="absolute bottom-16 right-2 w-52 rounded-xl2 bg-white p-2 shadow-card ring-1 ring-line">
        {more.map((n) => (
          <button
            key={n.r}
            onClick={(e) => {
              (e.currentTarget.closest('details') as HTMLDetailsElement).open = false;
              go(n.r);
            }}
            className={cx('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold', route === n.r ? 'bg-lpg-50 text-lpg-700' : 'text-graphite-soft hover:bg-cream-100')}
          >
            {n.icon}
            {n.label}
          </button>
        ))}
      </div>
    </details>
  );
}
