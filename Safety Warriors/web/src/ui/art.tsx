'use client';
import { AnimatePresence, motion, useTransform } from 'framer-motion';
import { useId } from 'react';
import { useHold } from '@core/useHold';
import type { Situation, ToolCategory } from '@/content';
import { cx } from './kit';

/* Safety Warriors illustration system: bold geometric badges, flat shapes, indigo outlines. Original SVG. */

const HEX = 'M32 3l25 14.5v29L32 61 7 46.5v-29z';
const C = { teal: '#0E9F8E', emerald: '#16A660', indigo: '#2E2A6B', tang: '#FF9F5A', sos: '#E23B3B', cream: '#FFF8EC', white: '#FFFFFF' };

export function Logo({ size = 34, word = true, light }: { size?: number; word?: boolean; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <path d={HEX} fill={C.indigo} />
        <path d="M32 11l17 10v20L32 51 15 41V21z" fill={C.teal} />
        <path d="M34 17l-10 17h8l-3 13 11-18h-8z" fill={C.tang} stroke={C.indigo} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      {word && (
        <span className={cx('font-display text-[1.1rem] font-bold leading-none tracking-tight', light ? 'text-white' : 'text-indigo-800')}>
          Safety <span className={light ? 'text-tang-300' : 'text-teal-600'}>Warriors</span>
        </span>
      )}
    </span>
  );
}

/** Hexagon badge that must be held. The outline fills; release early and nothing happens. */
export function SosBadge({ onComplete, size = 220, label = 'SOS', sub = 'Hold 3 seconds', tone = 'sos', ms = 3000 }: { onComplete: () => void; size?: number; label?: string; sub?: string; tone?: 'sos' | 'indigo'; ms?: number }) {
  const h = useHold(ms, onComplete);
  const id = useId().replace(/:/g, '');
  const dash = useTransform(h.progress, (p) => `${p * 200} 200`);
  const [a, b] = tone === 'sos' ? ['#F05A5A', '#B92424'] : ['#4B44B8', '#221F52'];
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {tone === 'sos' && <motion.div className="absolute inset-[12%] rounded-full bg-sos-500/20 blur-2xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2.2, repeat: Infinity }} />}
      <motion.button type="button" {...h.handlers} aria-label={`${label}. Press and hold for ${ms / 1000} seconds`} animate={h.fired ? { scale: [1, 1.1, 1], rotate: [0, -3, 0] } : h.holding ? { scale: 0.95 } : { scale: 1 }} transition={{ type: 'spring', stiffness: 460, damping: 18 }} className="relative z-10 touch-none select-none rounded-3xl outline-none focus-visible:ring-8 focus-visible:ring-teal-100" style={{ width: size, height: size, WebkitTouchCallout: 'none' }}>
        <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={a} />
              <stop offset="1" stopColor={b} />
            </linearGradient>
          </defs>
          <path d={HEX} fill={C.indigo} transform="translate(1.2 1.8)" />
          <path d={HEX} fill={`url(#${id})`} />
          <path d="M32 9l20 11.5v23L32 55 12 43.5v-23z" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="1" />
          <motion.path d={HEX} fill="none" stroke={tone === 'sos' ? C.tang : '#5ECFC2'} strokeWidth="2.6" strokeLinejoin="round" pathLength={200} style={{ strokeDasharray: dash }} />
        </svg>
        <span className="pointer-events-none relative flex h-full flex-col items-center justify-center text-white">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={h.left ?? 'l'} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className={cx('font-display font-extrabold leading-none tabular-nums', size < 150 ? 'text-2xl' : size < 200 ? 'text-4xl' : 'text-5xl')} aria-live="assertive">
              {h.left ?? label}
            </motion.span>
          </AnimatePresence>
          <span className="mt-1.5 text-[11px] font-semibold text-white/85">{h.left ? 'Keep holding…' : sub}</span>
        </span>
      </motion.button>
    </div>
  );
}

/** Illustrated badge for each emergency situation. */
export function SituationArt({ id, size = 56 }: { id: Situation; size?: number }) {
  const bg = { following: C.sos, harassment: C.tang, stalking: C.indigo, unsafe_public: C.teal, medical: C.sos, domestic: C.indigo, lost: C.emerald, general: C.sos }[id];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect x="2" y="4" width="58" height="58" rx="18" fill={C.indigo} />
      <rect x="4" y="2" width="58" height="58" rx="18" fill={bg} />
      <g transform="translate(4 2)" stroke={C.indigo} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        {id === 'following' && (<>
          <ellipse cx="20" cy="40" rx="5" ry="8" fill={C.cream} transform="rotate(-12 20 40)" /><circle cx="17" cy="28" r="2.5" fill={C.cream} />
          <ellipse cx="38" cy="26" rx="5" ry="8" fill={C.cream} transform="rotate(-12 38 26)" /><circle cx="35" cy="14" r="2.5" fill={C.cream} />
        </>)}
        {id === 'harassment' && (<>
          <path d="M22 46V24a3 3 0 016 0v10V18a3 3 0 016 0v16-12a3 3 0 016 0v14-8a3 3 0 016 0v12c0 9-6 14-13 14s-11-4-13-8l-5-9a3 3 0 015-3z" fill={C.cream} />
        </>)}
        {id === 'stalking' && (<>
          <path d="M8 29c6-10 14-14 21-14s15 4 21 14c-6 10-14 14-21 14S14 39 8 29z" fill={C.cream} />
          <circle cx="29" cy="29" r="8" fill={C.tang} /><circle cx="29" cy="29" r="3.5" fill={C.indigo} />
        </>)}
        {id === 'unsafe_public' && (<>
          <path d="M29 10l20 34H9z" fill={C.cream} /><path d="M29 22v11M29 38v1" strokeWidth="3.5" />
        </>)}
        {id === 'medical' && (<>
          <path d="M29 47S11 36 11 23a9 9 0 0118-3 9 9 0 0118 3c0 13-18 24-18 24z" fill={C.cream} />
          <path d="M29 22v13M22.5 28.5h13" stroke={C.sos} strokeWidth="4" />
        </>)}
        {id === 'domestic' && (<>
          <path d="M10 28L29 12l19 16v20H10z" fill={C.cream} />
          <path d="M29 42s-8-5-8-10a4 4 0 018-1 4 4 0 018 1c0 5-8 10-8 10z" fill={C.tang} />
        </>)}
        {id === 'lost' && (<>
          <circle cx="29" cy="29" r="18" fill={C.cream} /><path d="M36 22l-4 10-10 4 4-10z" fill={C.tang} /><circle cx="29" cy="29" r="2" fill={C.indigo} />
        </>)}
        {id === 'general' && (<>
          <path d="M17 44h24l-3-17a9 9 0 00-18 0z" fill={C.cream} /><rect x="13" y="44" width="32" height="6" rx="2" fill={C.tang} />
          <path d="M8 22l5 2M50 22l-5 2M29 7v5" strokeWidth="3" stroke={C.cream} />
        </>)}
      </g>
    </svg>
  );
}

/** Toolkit category art: a tilted tile with a geometric symbol. */
export function ToolArt({ id, size = 52 }: { id: ToolCategory; size?: number }) {
  const bg = { personal: C.teal, public: C.emerald, emergency: C.sos, medical: C.tang, digital: C.indigo, harassment: C.tang, stalking: C.indigo }[id];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect x="6" y="6" width="52" height="52" rx="14" fill={bg} transform="rotate(-6 32 32)" />
      <g stroke={C.white} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {id === 'personal' && <><circle cx="32" cy="25" r="7" /><path d="M19 47c2-8 7-11 13-11s11 3 13 11" /></>}
        {id === 'public' && <><rect x="20" y="16" width="24" height="28" rx="5" /><path d="M20 34h24M25 48l-3 4M39 48l3 4" /><circle cx="26" cy="39" r="1" /><circle cx="38" cy="39" r="1" /></>}
        {id === 'emergency' && <path d="M34 14L22 34h10l-2 16 12-20H32z" />}
        {id === 'medical' && <path d="M32 18v28M18 32h28" strokeWidth="6" />}
        {id === 'digital' && <><rect x="18" y="20" width="28" height="20" rx="3" /><path d="M26 48h12M32 40v8" /><path d="M28 29l3 3 6-6" /></>}
        {id === 'harassment' && <path d="M22 44V28a3 3 0 016 0v-8a3 3 0 016 0v8-4a3 3 0 016 0v14c0 6-4 10-9 10s-7-2-9-6l-4-6" />}
        {id === 'stalking' && <><path d="M14 32c5-8 11-11 18-11s13 3 18 11c-5 8-11 11-18 11s-13-3-18-11z" /><circle cx="32" cy="32" r="4" /></>}
      </g>
    </svg>
  );
}

/** Onboarding scenes. */
export function SceneToolkit() {
  const tiles: [number, number, string, number][] = [[40, 40, C.teal, -8], [130, 30, C.tang, 6], [220, 44, C.indigo, -4], [60, 120, C.emerald, 5], [150, 116, C.sos, -6], [236, 126, C.teal, 8]];
  return (
    <svg viewBox="0 0 320 220" className="w-full" aria-hidden>
      <rect width="320" height="220" rx="28" fill="#FDF1DC" />
      {tiles.map(([x, y, c, r], i) => (
        <motion.g key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08 * i, type: 'spring', stiffness: 300, damping: 18 }}>
          <rect x={x + 3} y={y + 4} width="64" height="64" rx="16" fill={C.indigo} transform={`rotate(${r} ${x + 32} ${y + 32})`} />
          <rect x={x} y={y} width="64" height="64" rx="16" fill={c} transform={`rotate(${r} ${x + 32} ${y + 32})`} />
        </motion.g>
      ))}
      <path d="M158 132l-12 20h10l-3 14 14-22h-10z" fill={C.cream} />
    </svg>
  );
}

export function ScenePlaybook() {
  return (
    <svg viewBox="0 0 320 220" className="w-full" aria-hidden>
      <rect width="320" height="220" rx="28" fill="#E5F7F5" />
      {[0, 1, 2].map((i) => (
        <motion.g key={i} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 * i }}>
          <rect x={58 + i * 6} y={36 + i * 54} width="204" height="44" rx="14" fill="#fff" stroke={C.indigo} strokeWidth="2.5" />
          <circle cx={84 + i * 6} cy={58 + i * 54} r="12" fill={[C.teal, C.tang, C.sos][i]} />
          <text x={84 + i * 6} y={63 + i * 54} textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" fontFamily="sans-serif">{i + 1}</text>
          <rect x={106 + i * 6} y={50 + i * 54} width={[110, 90, 70][i]} height="7" rx="3.5" fill={C.indigo} opacity=".75" />
          <rect x={106 + i * 6} y={62 + i * 54} width={[80, 120, 60][i]} height="6" rx="3" fill={C.indigo} opacity=".2" />
        </motion.g>
      ))}
    </svg>
  );
}

export function SceneChecklist() {
  return (
    <svg viewBox="0 0 320 220" className="w-full" aria-hidden>
      <rect width="320" height="220" rx="28" fill="#FFF1E6" />
      <rect x="86" y="24" width="148" height="176" rx="18" fill="#fff" stroke={C.indigo} strokeWidth="3" />
      <rect x="128" y="16" width="64" height="18" rx="9" fill={C.indigo} />
      {['Charged', 'Location', 'Contacts', 'Alerts'].map((t, i) => (
        <motion.g key={t} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + 0.18 * i }}>
          <rect x="104" y={52 + i * 36} width="22" height="22" rx="6" fill={C.emerald} />
          <path d={`M109 ${63 + i * 36}l4 4 8-9`} stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
          <text x="136" y={68 + i * 36} fontSize="13" fontWeight="700" fill={C.indigo} fontFamily="sans-serif">{t}</text>
        </motion.g>
      ))}
    </svg>
  );
}
