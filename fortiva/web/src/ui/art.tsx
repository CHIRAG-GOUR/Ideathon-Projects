'use client';
import { motion, useTransform } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import { useId } from 'react';
import { useHold } from '@core/useHold';
import { cx } from './kit';

/* Fortiva's illustration system: a connected ring of people, check-in clocks and network pulses. Original SVG. */

export function Logo({ size = 34, word = true, light }: { size?: number; word?: boolean; light?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2DD4BF" />
            <stop offset="1" stopColor="#2347D9" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="20" fill={`url(#${id})`} />
        <circle cx="32" cy="32" r="15" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2.5" />
        {[[32, 17], [45, 39.5], [19, 39.5]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="5" fill="#fff" />)}
        <path d="M26.5 32.5l4 4 7.5-8" stroke="#fff" strokeWidth="3.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {word && <span className={cx('text-[1.2rem] font-bold tracking-tight', light ? 'text-white' : 'text-cobalt-900')}>Fortiva</span>}
    </span>
  );
}

/** The check-in ring: fills as the next check approaches; colour follows the state. */
export function CountdownRing({ progress, size = 220, tone, children }: { progress: number; size?: number; tone: 'teal' | 'amber' | 'coral' | 'idle'; children: React.ReactNode }) {
  const r = 46, c = 2 * Math.PI * r;
  const color = { teal: '#14B8A6', amber: '#F59E0B', coral: '#E8432C', idle: '#B9CCFF' }[tone];
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#EEF3FF" strokeWidth="6" />
        <motion.circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, progress))) }} transition={{ duration: 0.6, ease: 'easeOut' }} />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
          <circle key={i} cx={50 + 38 * Math.cos((i * Math.PI) / 6)} cy={50 + 38 * Math.sin((i * Math.PI) / 6)} r="0.9" fill="#B9CCFF" />
        ))}
      </svg>
      {tone !== 'idle' && tone !== 'teal' && <motion.span className="absolute inset-3 rounded-full" style={{ boxShadow: `0 0 0 6px ${color}33` }} animate={{ opacity: [0.9, 0.2, 0.9] }} transition={{ duration: 1.2, repeat: Infinity }} />}
      <div className="relative text-center">{children}</div>
    </div>
  );
}

/** Round SOS control: hold to send. The ring fills; release early and nothing happens. */
export function SosRing({ onComplete, size = 220, label = 'SOS', sub = 'Hold 3 seconds', tone = 'coral', ms = 3000 }: { onComplete: () => void; size?: number; label?: string; sub?: string; tone?: 'coral' | 'dark'; ms?: number }) {
  const h = useHold(ms, onComplete);
  const r = 47, c = 2 * Math.PI * r;
  const off = useTransform(h.progress, (p) => c * (1 - p));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {tone === 'coral' && [0, 1].map((i) => <motion.span key={i} className="absolute inset-6 rounded-full bg-coral-400/25" animate={{ scale: [1, 1.35], opacity: [0.6, 0] }} transition={{ duration: 2.2, repeat: Infinity, delay: i * 1.1 }} />)}
      <motion.button type="button" {...h.handlers} aria-label={`${label}. Press and hold for ${ms / 1000} seconds`} animate={h.fired ? { scale: [1, 1.1, 1] } : h.holding ? { scale: 0.95 } : { scale: 1 }} transition={{ type: 'spring', stiffness: 480, damping: 20 }} className={cx('relative z-10 grid touch-none select-none place-items-center rounded-full text-white outline-none focus-visible:ring-8 focus-visible:ring-cobalt-200', tone === 'coral' ? 'bg-gradient-to-br from-coral-400 to-coral-700 shadow-coral' : 'bg-gradient-to-br from-ink-soft to-ink')} style={{ width: size * 0.8, height: size * 0.8, WebkitTouchCallout: 'none' }}>
        <svg viewBox="0 0 100 100" className="absolute -inset-[11%] h-[122%] w-[122%] -rotate-90" aria-hidden>
          <motion.circle cx="50" cy="50" r={r} fill="none" stroke={tone === 'coral' ? '#C2321E' : '#2347D9'} strokeWidth="3" strokeLinecap="round" strokeDasharray={c} style={{ strokeDashoffset: off }} />
        </svg>
        <span className="pointer-events-none flex flex-col items-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={h.left ?? 'l'} initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className={cx('font-bold leading-none tabular-nums', size < 130 ? 'text-lg' : size < 190 ? 'text-3xl' : 'text-5xl')} aria-live="assertive">
              {h.left ?? label}
            </motion.span>
          </AnimatePresence>
          <span className="mt-1.5 text-xs font-medium text-white/85">{h.left ? 'Keep holding…' : sub}</span>
        </span>
      </motion.button>
    </div>
  );
}

const ROLE_COLOR = { primary: '#2347D9', family: '#14B8A6', friend: '#A78BFA', emergency: '#FF5A43' } as const;
export const roleColor = (r: keyof typeof ROLE_COLOR) => ROLE_COLOR[r];

/** You in the middle, your Trusted Circle around you; lines pulse when connected. */
export function NetworkArt({ people, size = 200, live = true }: { people: { name: string; role: keyof typeof ROLE_COLOR }[]; size?: number; live?: boolean }) {
  const n = Math.max(people.length, 1);
  const shown = people.length ? people.slice(0, 6) : [{ name: '+', role: 'friend' as const }];
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden>
      <circle cx="100" cy="100" r="72" fill="none" stroke="#DCE6FF" strokeWidth="1.5" strokeDasharray="3 6" />
      {shown.map((p, i) => {
        const a = (i / Math.min(n, 6)) * Math.PI * 2 - Math.PI / 2;
        const x = 100 + 72 * Math.cos(a), y = 100 + 72 * Math.sin(a);
        return (
          <g key={i}>
            <motion.line x1="100" y1="100" x2={x} y2={y} stroke={ROLE_COLOR[p.role]} strokeWidth="2" strokeDasharray="4 5" initial={{ pathLength: 0 }} animate={{ pathLength: 1, strokeDashoffset: live ? [0, -18] : 0 }} transition={{ pathLength: { delay: 0.1 * i, duration: 0.6 }, strokeDashoffset: { duration: 1.4, repeat: Infinity, ease: 'linear' } }} />
            <circle cx={x} cy={y} r="17" fill="#fff" stroke={ROLE_COLOR[p.role]} strokeWidth="3" />
            <text x={x} y={y + 5.5} textAnchor="middle" fontSize="15" fontWeight="700" fill={ROLE_COLOR[p.role]} fontFamily="sans-serif">{p.name.slice(0, 1).toUpperCase()}</text>
          </g>
        );
      })}
      <circle cx="100" cy="100" r="26" fill="#2347D9" />
      <path d="M90 100.5l7 7 13-14" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Onboarding scenes. */
export function SceneCheck() {
  return (
    <svg viewBox="0 0 320 220" className="w-full" aria-hidden>
      <rect width="320" height="220" rx="32" fill="#EEF3FF" />
      <circle cx="270" cy="40" r="44" fill="#C6F4EE" opacity=".6" />
      <rect x="112" y="26" width="96" height="172" rx="20" fill="#13245F" />
      <rect x="119" y="36" width="82" height="152" rx="14" fill="#FFFCF8" />
      <motion.circle cx="160" cy="92" r="30" fill="none" stroke="#14B8A6" strokeWidth="6" strokeLinecap="round" strokeDasharray="188" initial={{ strokeDashoffset: 188 }} animate={{ strokeDashoffset: 40 }} transition={{ duration: 1.6, ease: 'easeOut' }} style={{ rotate: -90, originX: '160px', originY: '92px' }} />
      <text x="160" y="98" textAnchor="middle" fontSize="16" fontWeight="700" fill="#13245F" fontFamily="sans-serif">29:40</text>
      <rect x="130" y="138" width="60" height="22" rx="11" fill="#2347D9" />
      <text x="160" y="153" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="sans-serif">I&apos;m OK</text>
      <motion.g initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
        <rect x="214" y="112" width="86" height="36" rx="18" fill="#fff" />
        <text x="257" y="134" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0F766E" fontFamily="sans-serif">✓ Checked in</text>
      </motion.g>
    </svg>
  );
}

export function SceneCircle() {
  return (
    <div className="grid place-items-center rounded-[32px] bg-gradient-to-br from-lav-50 to-teal-50 py-3">
      <NetworkArt size={200} people={[{ name: 'Mom', role: 'primary' }, { name: 'Ravi', role: 'family' }, { name: 'Anu', role: 'friend' }, { name: 'Neha', role: 'friend' }, { name: 'Help', role: 'emergency' }]} />
    </div>
  );
}

export function SceneEscalate() {
  return (
    <svg viewBox="0 0 320 220" className="w-full" aria-hidden>
      <rect width="320" height="220" rx="32" fill="#FFF2EF" />
      {[0, 1, 2].map((i) => <motion.circle key={i} cx="160" cy="110" r="30" fill="none" stroke="#FF8A73" strokeWidth="2" animate={{ r: [30, 95], opacity: [0.8, 0] }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8 }} />)}
      <circle cx="160" cy="110" r="30" fill="#FF5A43" />
      <path d="M160 95v18M160 122v1" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      {[[52, 60, '#2347D9'], [270, 64, '#14B8A6'], [60, 168, '#A78BFA'], [262, 166, '#2347D9']].map(([x, y, c], i) => (
        <g key={i}>
          <circle cx={x as number} cy={y as number} r="16" fill="#fff" stroke={c as string} strokeWidth="3" />
          <path d={`M${(x as number) - 6} ${y}l4 4 8-8`} stroke={c as string} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}
