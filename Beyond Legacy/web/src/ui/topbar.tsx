// Top-bar tools: product search, notifications (open "Now" moves), sync status and the profile menu.
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductArt } from '../art/ProductArt';
import { useWorkspace } from '../state/session';
import { isCritical } from './decision';
import { IconBell, IconSearch, IconSettings, IconSignOut, IconSync } from './icons';
import { ActionBadge, cx } from './kit';

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const f = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close();
    addEventListener('mousedown', f);
    addEventListener('keydown', k);
    return () => (removeEventListener('mousedown', f), removeEventListener('keydown', k));
  }, [open, close]);
  return ref;
}

export function SearchBox({ autoFocus, onDone }: { autoFocus?: boolean; onDone?: () => void }) {
  const { analysis } = useWorkspace();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const ref = useOutside(open, () => setOpen(false));
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? analysis.products.filter((a) => a.product.name.toLowerCase().includes(t) || a.product.category.toLowerCase().includes(t)).slice(0, 7) : [];
  }, [q, analysis]);
  const go = (id: string) => {
    nav(`/products/${id}`);
    setQ('');
    setOpen(false);
    onDone?.();
  };
  return (
    <div ref={ref} className="relative w-full">
      <label className="relative block">
        <span className="sr-only">Search products</span>
        <IconSearch size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input autoFocus={autoFocus} value={q} onChange={(e) => (setQ(e.target.value), setOpen(true), setI(0))} onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') (e.preventDefault(), setI((x) => Math.min(results.length - 1, x + 1)));
            if (e.key === 'ArrowUp') (e.preventDefault(), setI((x) => Math.max(0, x - 1)));
            if (e.key === 'Enter' && results[i]) go(results[i].product.id);
          }}
          role="combobox" aria-expanded={open && results.length > 0} aria-controls="search-results" aria-autocomplete="list"
          placeholder="Search products…" className="h-11 w-full rounded-2xl border border-line bg-surface pl-10 pr-3 text-[14.5px] text-ink placeholder:text-ink-faint focus:border-green focus:outline-none focus:ring-4 focus:ring-green/15" />
      </label>
      <AnimatePresence>
        {open && q.trim() && (
          <motion.ul id="search-results" role="listbox" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl bg-surface p-1.5 shadow-lift ring-1 ring-line">
            {results.length === 0 ? <li className="px-3 py-3 text-[13.5px] text-ink-muted">No product matches “{q}”.</li> : results.map((a, k) => (
              <li key={a.product.id} role="option" aria-selected={k === i}>
                <button onMouseEnter={() => setI(k)} onClick={() => go(a.product.id)} className={cx('flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left', k === i && 'bg-cream')}>
                  <ProductArt product={a.product} size={38} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-bold text-ink">{a.product.name}</span><span className="text-[12px] text-ink-muted">{a.product.stock} in stock · {a.product.category}</span></span>
                  <ActionBadge action={a.recommendation.action} size="sm" critical={isCritical(a)} />
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Notifications({ dark }: { dark?: boolean }) {
  const { analysis } = useWorkspace();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const now = analysis.nextMoves.filter((a) => a.recommendation.bucket === 'NOW');
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-label={`Notifications: ${now.length} moves need action now`} aria-expanded={open}
        className={cx('relative grid h-11 w-11 place-items-center rounded-2xl', dark ? 'text-white hover:bg-white/10' : 'bg-surface text-ink-2 ring-1 ring-line hover:bg-cream')}>
        <IconBell size={20} />
        {now.length > 0 && <span className="absolute right-1.5 top-1.5 min-w-[18px] rounded-full bg-red px-1 text-center text-[10px] font-extrabold leading-[18px] text-white">{now.length}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl bg-surface shadow-lift ring-1 ring-line">
            <div className="bg-green-dark px-4 py-3 text-white"><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-yellow">Needs action now</p><p className="text-[13px] text-white/75">{now.length ? `${now.length} critical ${now.length === 1 ? 'move' : 'moves'}` : 'Nothing critical right now'}</p></div>
            <ul className="max-h-[360px] overflow-y-auto p-1.5">
              {now.map((a) => (
                <li key={a.product.id}>
                  <button onClick={() => (nav(`/products/${a.product.id}`), setOpen(false))} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-cream">
                    <ProductArt product={a.product} size={40} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-bold text-ink">{a.product.name}</span><span className="block truncate text-[12px] text-ink-muted">{a.recommendation.headline}</span></span>
                    <ActionBadge action={a.recommendation.action} size="sm" critical={isCritical(a)} />
                  </button>
                </li>
              ))}
              {now.length > 0 && <li><button onClick={() => (nav('/next-moves'), setOpen(false))} className="w-full rounded-xl px-3 py-2.5 text-[13px] font-extrabold text-green hover:bg-cream">Open all next moves →</button></li>}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SyncPill({ dark }: { dark?: boolean }) {
  const { mode, updatedAt } = useWorkspace();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    addEventListener('online', on);
    addEventListener('offline', off);
    return () => (removeEventListener('online', on), removeEventListener('offline', off));
  }, []);
  const label = mode === 'local' ? 'On this device' : online ? 'Synced' : 'Offline — saving locally';
  return (
    <span className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold', dark ? 'bg-white/10 text-white/85' : 'bg-surface text-ink-2 ring-1 ring-line')} title={updatedAt ? `Last change ${new Date(updatedAt).toLocaleTimeString()}` : undefined}>
      <span className={cx('h-2 w-2 rounded-full', mode === 'local' ? 'bg-yellow' : online ? 'bg-green-mid' : 'bg-orange')} />
      <IconSync size={14} />
      {label}{updatedAt && mode === 'cloud' && online ? ` ${new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
    </span>
  );
}

export function ProfileMenu() {
  const s = useWorkspace();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const name = s.user?.name || s.workspace.store.managerName;
  const initials = name.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-label="Account menu" aria-expanded={open} className="grid h-11 w-11 place-items-center rounded-2xl bg-green-dark font-display text-[15px] font-extrabold text-yellow">{initials || 'BL'}</button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 rounded-2xl bg-surface p-1.5 shadow-lift ring-1 ring-line">
            <div className="px-3 py-2"><p className="truncate text-[14px] font-extrabold text-ink">{name}</p><p className="truncate text-[12px] text-ink-muted">{s.user?.email ?? 'On this device'}</p></div>
            <button onClick={() => (nav('/settings'), setOpen(false))} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-ink-2 hover:bg-cream"><IconSettings size={18} />Settings</button>
            {s.mode === 'cloud' && <button onClick={() => s.signOut()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-red-ink hover:bg-red-soft"><IconSignOut size={18} />Sign out</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
