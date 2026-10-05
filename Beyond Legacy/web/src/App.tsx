import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { StorefrontMini } from './art/scenes';
import { SessionProvider, useWorkspace } from './state/session';
import Overview from './screens/Overview';
import { IconCart, IconInsights, IconInventory, IconMore, IconNextMove, IconOverview, IconPlus, IconSearch, IconSettings, IconStore, Logo } from './ui/icons';
import { Button, cx, Sheet, ToastProvider } from './ui/kit';
import { SheetsProvider, useSheets } from './ui/sheets';
import { Notifications, ProfileMenu, SearchBox, SyncPill } from './ui/topbar';

const Inventory = lazy(() => import('./screens/Inventory'));
const NextMoves = lazy(() => import('./screens/NextMoves'));
const ProductDetail = lazy(() => import('./screens/ProductDetail'));
const Insights = lazy(() => import('./screens/Insights'));
const StorePage = lazy(() => import('./screens/StorePage'));
const Settings = lazy(() => import('./screens/Settings'));

const NAV = [
  { to: '/', label: 'Overview', icon: IconOverview, end: true },
  { to: '/inventory', label: 'Inventory', icon: IconInventory },
  { to: '/next-moves', label: 'Next Moves', icon: IconNextMove },
  { to: '/insights', label: 'Insights', icon: IconInsights },
  { to: '/store', label: 'Store', icon: IconStore },
  { to: '/settings', label: 'Settings', icon: IconSettings },
];

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <BrowserRouter>
          <SessionProvider>
            <SheetsProvider>
              <Shell />
            </SheetsProvider>
          </SessionProvider>
        </BrowserRouter>
      </ToastProvider>
    </MotionConfig>
  );
}

function Sidebar() {
  const { workspace, analysis } = useWorkspace();
  const sheets = useSheets();
  const open = analysis.nextMoves.length;
  const h = analysis.health;
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col overflow-y-auto bg-green-dark text-white lg:flex">
      <div className="flex items-center gap-3 px-5 pb-3 pt-6">
        <Logo size={40} onDark />
        <div>
          <p className="font-display text-[19px] font-extrabold leading-tight tracking-tight">Beyond Legacy</p>
          <p className="text-[11px] font-semibold text-white/60">Know what to do next</p>
        </div>
      </div>
      <div className="mx-4 mt-2 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-inset ring-white/10">
        <StorefrontMini className="w-full" />
        <p className="mt-2 truncate text-[14px] font-extrabold">{workspace.store.name}</p>
        <p className="truncate text-[11.5px] text-white/60">{workspace.store.area || workspace.store.type}{workspace.store.demo ? ' · Demo data' : ''}</p>
      </div>
      <nav className="mt-4 space-y-1 px-3" aria-label="Main">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('relative flex h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-bold transition-colors', isActive ? 'text-ink' : 'text-white/80 hover:bg-white/[0.07] hover:text-white')}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="side-active" className="absolute inset-0 rounded-xl bg-yellow" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <n.icon size={20} className="relative" />
                <span className="relative">{n.label}</span>
                {n.to === '/next-moves' && open > 0 && <span className={cx('relative ml-auto rounded-full px-2 py-0.5 text-[11px] font-extrabold tabular-nums', isActive ? 'bg-green-dark text-yellow' : 'bg-red text-white')}>{open}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-4 space-y-2 px-4">
        <Button tone="accent" className="w-full" onClick={sheets.addProduct}><IconPlus size={18} />Add product</Button>
        <Button tone="light" className="w-full" onClick={() => sheets.recordSale()}><IconCart size={18} />Record sale</Button>
      </div>
      <div className="mt-auto p-4">
        <div className="rounded-2xl bg-green-deep p-4">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-white/55">Store health</p>
          <p className="mt-1 font-display text-[34px] font-extrabold leading-none tabular-nums text-yellow">{h.pct ?? '—'}%</p>
          <p className="text-[12px] font-semibold text-white/70">Inventory healthy</p>
          <div className="mt-3 flex h-1.5 gap-[2px] overflow-hidden rounded-full bg-white/10">
            {[[h.stockout, 'bg-red'], [h.expiry, 'bg-yellow'], [h.slow, 'bg-orange'], [h.healthy, 'bg-green-mid']].map(([v, c]) => (v as number) > 0 && <span key={c as string} className={c as string} style={{ width: `${((v as number) / Math.max(1, h.total)) * 100}%` }} />)}
          </div>
          <div className="mt-3 border-t border-white/10 pt-3"><SyncPill dark /></div>
        </div>
      </div>
    </aside>
  );
}

function Shell() {
  const { workspace, analysis, error: syncError } = useWorkspace();
  const sheets = useSheets();
  const loc = useLocation();
  const [more, setMore] = useState(false);
  const [search, setSearch] = useState(false);
  const open = analysis.nextMoves.length;
  return (
    <div className="min-h-dvh bg-cream">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-white">Skip to content</a>
      <Sidebar />

      {/* desktop top bar */}
      <header className="sticky top-0 z-20 hidden items-center gap-3 border-b border-line bg-cream/85 px-8 py-3 backdrop-blur lg:ml-[264px] lg:flex">
        <div className="min-w-0">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink-faint">Store</p>
          <p className="truncate font-display text-[16px] font-extrabold text-ink">{workspace.store.name}</p>
        </div>
        <span className="mx-2 h-8 w-px bg-line" aria-hidden />
        <div className="max-w-md flex-1"><SearchBox /></div>
        <div className="ml-auto flex items-center gap-2">
          <SyncPill />
          <Notifications />
          <ProfileMenu />
        </div>
      </header>

      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-2 bg-green-dark px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] text-white lg:hidden">
        <Logo size={32} onDark />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[16px] font-extrabold leading-tight">Beyond Legacy</p>
          <p className="truncate text-[11px] text-white/65">{workspace.store.name}</p>
        </div>
        <button onClick={() => setSearch(true)} aria-label="Search products" className="grid h-11 w-11 place-items-center rounded-2xl hover:bg-white/10"><IconSearch size={20} /></button>
        <Notifications dark />
      </header>

      <main id="main" className="pb-[calc(104px+env(safe-area-inset-bottom))] lg:ml-[264px] lg:pb-12">
        <div className="mx-auto max-w-[1280px] px-4 pt-5 sm:px-6 lg:px-8 lg:pt-7">
          {syncError && (
            <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-red-soft px-4 py-3 text-[14px] font-semibold text-red-ink">
              <span className="flex-1">Live sync: {syncError}</span>
              <Button size="sm" onClick={() => location.reload()}>Reload</Button>
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={loc.pathname.split('/').slice(0, 3).join('/')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}>
              <Suspense fallback={<div className="h-72 animate-pulse rounded-xl4 bg-cream-deep" aria-label="Loading" />}>
                <Routes location={loc}>
                  <Route path="/" element={<Overview />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/next-moves" element={<NextMoves />} />
                  <Route path="/products" element={<Navigate to="/inventory" replace />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/insights" element={<Insights />} />
                  <Route path="/insights/:tab" element={<Insights />} />
                  <Route path="/store" element={<StorePage />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* mobile bottom navigation */}
      <nav aria-label="Main" className="fixed inset-x-3 bottom-[max(10px,env(safe-area-inset-bottom))] z-40 grid grid-cols-5 rounded-[22px] bg-green-dark p-1.5 shadow-lift lg:hidden">
        {[NAV[0], NAV[1], NAV[2], NAV[3]].map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('relative flex h-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[10.5px] font-extrabold', isActive ? 'text-ink' : 'text-white/75')}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="tab" className="absolute inset-0 rounded-2xl bg-yellow" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <span className="relative">
                  <n.icon size={22} />
                  {n.to === '/next-moves' && open > 0 && <span className="absolute -right-3 -top-1.5 min-w-[18px] rounded-full bg-red px-1 text-center text-[10px] font-extrabold leading-[18px] text-white ring-2 ring-green-dark">{open}</span>}
                </span>
                <span className="relative">{n.label === 'Next Moves' ? 'Moves' : n.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button onClick={() => setMore(true)} className={cx('relative flex h-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[10.5px] font-extrabold', ['/store', '/settings'].some((p) => loc.pathname.startsWith(p)) ? 'bg-white/15 text-white' : 'text-white/75')}>
          <IconMore size={22} />More
        </button>
      </nav>
      <Sheet open={more} onClose={() => setMore(false)} title="More">
        <div className="grid gap-2">
          <Button tone="accent" size="lg" onClick={() => (setMore(false), sheets.addProduct())}><IconPlus size={18} />Add product</Button>
          <Button size="lg" onClick={() => (setMore(false), sheets.recordSale())}><IconCart size={18} />Record sale</Button>
          {[NAV[4], NAV[5]].map((n) => (
            <NavLink key={n.to} to={n.to} onClick={() => setMore(false)} className={({ isActive }) => cx('flex h-14 items-center gap-3 rounded-2xl px-4 text-[15px] font-bold', isActive ? 'bg-green-dark text-yellow' : 'bg-surface text-ink ring-1 ring-line')}>
              <n.icon size={21} />{n.label}
            </NavLink>
          ))}
        </div>
      </Sheet>
      <Sheet open={search} onClose={() => setSearch(false)} title="Search products"><SearchBox autoFocus onDone={() => setSearch(false)} /></Sheet>
    </div>
  );
}
