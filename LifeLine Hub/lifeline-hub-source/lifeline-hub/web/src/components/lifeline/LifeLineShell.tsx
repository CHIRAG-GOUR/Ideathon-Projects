'use client';
/**
 * LifeLineShell — the calm, normal-state frame. Desktop: a midnight command rail. Mobile: a clean bottom bar
 * (Home · SOS · Health · Radar · More) with More as a bottom sheet. Page transitions are short and directional.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { useApp, type Screen } from '@/ctx';
import { Icon, type IconName } from '@/ui/icons';
import { Logo, Mark } from '@/ui/brand';
import { BottomSheet, StatusChip, cx, spring } from '@/ui/kit';
import { Home } from '@/screens/Home';
import { SosPush } from '@/screens/SosPush';
import { VaultScreen } from '@/screens/VaultScreen';
import { RadarScreen } from '@/screens/RadarScreen';
import { GuidanceScreen } from '@/screens/GuidanceScreen';
import { ServicesScreen } from '@/screens/ServicesScreen';
import { HelpersScreen } from '@/screens/HelpersScreen';
import { DevicesScreen } from '@/screens/DevicesScreen';
import { MoreScreen } from '@/screens/MoreScreen';
import { ContactsScreen } from '@/screens/ContactsScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { PrivacyScreen } from '@/screens/PrivacyScreen';

// The cinematic is loaded only when someone opens it — Home / SOS / Health never download it.
const ExperienceScreen = lazy(() => import('@/screens/ExperienceScreen'));

const RAIL: { s: Screen; label: string; icon: IconName }[] = [
  { s: 'home', label: 'Home', icon: 'home' },
  { s: 'sos', label: 'SOS Push', icon: 'sos' },
  { s: 'vault', label: 'Health Vault', icon: 'vault' },
  { s: 'radar', label: 'Geo-Radar', icon: 'radar' },
  { s: 'guidance', label: 'AI Guidance', icon: 'ai' },
  { s: 'services', label: 'Services', icon: 'services' },
  { s: 'helpers', label: 'Helpers', icon: 'helpers' },
  { s: 'experience', label: 'Experience', icon: 'film' },
];
const MOBILE: { s: Screen; label: string; icon: IconName }[] = [
  { s: 'home', label: 'Home', icon: 'home' },
  { s: 'vault', label: 'Health', icon: 'vault' },
  { s: 'sos', label: 'SOS', icon: 'sos' },
  { s: 'radar', label: 'Radar', icon: 'radar' },
  { s: 'more', label: 'More', icon: 'more' },
];
export const MORE_ITEMS: { s: Screen; label: string; icon: IconName; sub: string }[] = [
  { s: 'guidance', label: 'AI Guidance', icon: 'ai', sub: 'Know what to do next' },
  { s: 'services', label: 'Emergency services', icon: 'services', sub: 'Ambulance, police, fire' },
  { s: 'helpers', label: 'LifeLine Helpers', icon: 'helpers', sub: 'Community response' },
  { s: 'experience', label: 'Experience LifeLine', icon: 'film', sub: 'The cinematic demo' },
  { s: 'contacts', label: 'Emergency contacts', icon: 'family', sub: 'Who gets alerted' },
  { s: 'devices', label: 'Connected devices', icon: 'watch', sub: 'Wearables · coming soon' },
  { s: 'history', label: 'Emergency history', icon: 'history', sub: 'Past SOS events' },
  { s: 'settings', label: 'Settings', icon: 'settings', sub: 'Numbers, guidance, account' },
  { s: 'privacy', label: 'Privacy & data', icon: 'lock', sub: 'What is stored, delete' },
];

function screenFor(s: Screen): ReactNode {
  switch (s) {
    case 'home': return <Home />;
    case 'sos': return <SosPush />;
    case 'vault': return <VaultScreen />;
    case 'radar': return <RadarScreen />;
    case 'guidance': return <GuidanceScreen />;
    case 'services': return <ServicesScreen />;
    case 'helpers': return <HelpersScreen />;
    case 'devices': return <DevicesScreen />;
    case 'experience': return <Suspense fallback={<div className="grid min-h-[70vh] place-items-center"><motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }}><Mark size={56} /></motion.div></div>}><ExperienceScreen /></Suspense>;
    case 'more': return <MoreScreen />;
    case 'contacts': return <ContactsScreen />;
    case 'settings': return <SettingsScreen />;
    case 'history': return <HistoryScreen />;
    case 'privacy': return <PrivacyScreen />;
  }
}

export function LifeLineShell() {
  const { nav, demo, setDemo, fix, online } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);
  const isActive = (s: Screen) => nav.screen === s || (s === 'more' && MORE_ITEMS.some((m) => m.s === nav.screen) && !RAIL.slice(0, 4).some((r) => r.s === nav.screen));
  return (
    <div className="min-h-screen canvas-calm lg:flex">
      {/* ---------------- desktop rail ---------------- */}
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col surface-command px-4 py-6 text-white lg:flex">
        <div className="px-2"><Logo light /></div>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Main">
          {RAIL.map((n) => {
            const on = nav.screen === n.s;
            return (
              <button key={n.s} onClick={() => nav.tab(n.s)} aria-current={on ? 'page' : undefined} className={cx('relative flex h-11 items-center gap-3 rounded-2xl px-3 text-[14px] font-medium transition-colors', on ? 'text-white' : 'text-midnight-200 hover:text-white')}>
                {on && <motion.span layoutId="rail" transition={spring} className="absolute inset-0 rounded-2xl bg-white/[0.08] ring-1 ring-inset ring-cyan-300/20" />}
                {on && <motion.span layoutId="railbar" transition={spring} className="absolute left-0 top-2.5 h-6 w-[3px] rounded-full bg-cyan-400" />}
                <Icon name={n.icon} size={19} className={cx('relative', n.s === 'sos' && 'text-coral-400')} />
                <span className="relative">{n.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="mt-6 border-t border-white/10 pt-4">
          {MORE_ITEMS.filter((m) => !RAIL.some((r) => r.s === m.s)).map((m) => (
            <button key={m.s} onClick={() => nav.tab(m.s)} className={cx('flex h-9 w-full items-center gap-3 rounded-xl px-3 text-[13px] transition-colors', nav.screen === m.s ? 'bg-white/[0.08] text-white' : 'text-midnight-300 hover:text-white')}>
              <Icon name={m.icon} size={16} />{m.label}
            </button>
          ))}
        </div>
        <div className="mt-auto space-y-3">
          {demo && (
            <button onClick={() => setDemo(false)} className="w-full rounded-2xl bg-violet-500/15 px-3 py-2.5 text-left ring-1 ring-inset ring-violet-300/30">
              <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200">Demo mode</span>
              <span className="block text-[12px] text-violet-100/80">Fictional data · nothing is sent. Exit</span>
            </button>
          )}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => nav.tab('sos')} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-coral-500 font-display text-[16px] font-semibold tracking-wide text-white shadow-coral">
            <span className="relative grid h-2.5 w-2.5 place-items-center"><span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-white/70" /><span className="h-2 w-2 rounded-full bg-white" /></span>
            SOS
          </motion.button>
        </div>
      </aside>

      {/* ---------------- content ---------------- */}
      <div className="min-w-0 flex-1 pb-28 lg:pb-12">
        {/* top status strip */}
        <header className="sticky top-0 z-30 border-b border-line/70 glass">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-8">
            <div className="lg:hidden"><Logo size={30} /></div>
            <div className="hidden items-center gap-2 lg:flex">
              <StatusChip status="ready" label="Emergency ready" />
              <StatusChip status={fix ? 'locked' : 'pending'} label={fix ? (demo ? 'Demo location' : 'Location ready') : 'Location off'} />
              {!online && <StatusChip status="offline" label="Offline · SMS fallback" />}
            </div>
            <div className="flex items-center gap-2">
              {demo && <span className="rounded-full bg-violet-500 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white">Demo</span>}
              <button onClick={() => nav.tab('settings')} aria-label="Settings" className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-clinic-100"><Icon name="settings" size={19} /></button>
            </div>
          </div>
        </header>
        <AnimatePresence mode="wait" initial={false}>
          <motion.main key={nav.screen + (nav.arg ?? '')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
            {screenFor(nav.screen)}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* ---------------- mobile bottom bar ---------------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 glass pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Main">
        <div className="mx-auto grid max-w-lg grid-cols-5 px-2">
          {MOBILE.map((n) => {
            const on = isActive(n.s);
            if (n.s === 'sos')
              return (
                <div key="sos" className="grid place-items-center">
                  <motion.button whileTap={{ scale: 0.92 }} onClick={() => nav.tab('sos')} aria-label="SOS Push" className="-mt-6 grid h-16 w-16 place-items-center rounded-full bg-coral-500 font-display text-[15px] font-bold text-white shadow-coral ring-4 ring-white">
                    SOS
                  </motion.button>
                </div>
              );
            return (
              <button key={n.s} onClick={() => (n.s === 'more' ? setMoreOpen(true) : nav.tab(n.s))} aria-current={on ? 'page' : undefined} className="relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold">
                {on && <motion.span layoutId="mtab" transition={spring} className="absolute top-0 h-[3px] w-8 rounded-full bg-teal-500" />}
                <Icon name={n.icon} size={21} className={on ? 'text-teal-600' : 'text-ink-muted'} />
                <span className={on ? 'text-ink' : 'text-ink-muted'}>{n.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title={<p className="font-display text-[18px] font-semibold">More</p>}>
        <div className="grid grid-cols-2 gap-2">
          {MORE_ITEMS.map((m, i) => (
            <motion.button key={m.s} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => { setMoreOpen(false); nav.tab(m.s); }} className="flex items-start gap-3 rounded-2xl bg-clinic-50 p-3 text-left ring-1 ring-inset ring-line">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-teal-600 ring-1 ring-line"><Icon name={m.icon} size={18} /></span>
              <span className="min-w-0"><b className="block text-[13.5px] text-ink">{m.label}</b><span className="block text-[11.5px] leading-tight text-ink-muted">{m.sub}</span></span>
            </motion.button>
          ))}
        </div>
        {demo && <button onClick={() => { setMoreOpen(false); setDemo(false); }} className="mt-3 w-full rounded-2xl bg-violet-50 p-3 text-left text-[13px] font-semibold text-violet-600">Exit demo mode</button>}
      </BottomSheet>
    </div>
  );
}

/** Standard page frame. */
export function Page({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={cx('mx-auto w-full px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-8', wide ? 'max-w-7xl' : 'max-w-6xl', className)}>{children}</div>;
}
export function PageTitle({ kicker, title, sub, right, tone }: { kicker: string; title: string; sub?: ReactNode; right?: ReactNode; tone?: 'teal' | 'violet' | 'coral' | 'cyan' }) {
  const c = { teal: 'text-teal-600', violet: 'text-violet-500', coral: 'text-coral-500', cyan: 'text-cyan-600' }[tone ?? 'teal'];
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className={cx('font-mono text-[11px] font-semibold uppercase tracking-[0.22em]', c)}>{kicker}</p>
        <h1 className="mt-1.5 font-display text-[30px] font-semibold leading-none tracking-[-0.03em] text-ink sm:text-[38px]">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-[15px] text-ink-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
