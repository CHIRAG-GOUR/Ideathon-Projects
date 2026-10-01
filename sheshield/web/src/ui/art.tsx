'use client';
import { motion } from 'framer-motion';
import { useId } from 'react';

/* She Shield's own illustration system: shields, protection rings, beacons and secure pins. Original SVG. */

const SHIELD = 'M32 4l22 8v17c0 14.5-9.6 25.6-22 31-12.4-5.4-22-16.5-22-31V12z';

export function Logo({ size = 34, word = true }: { size?: number; word?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8E2DE2" />
            <stop offset="1" stopColor="#3B1E77" />
          </linearGradient>
        </defs>
        <path d={SHIELD} fill={`url(#${id})`} />
        <path d="M32 18c-6 0-10 4.4-10 9.6C22 36 32 43 32 43s10-7 10-15.4C42 22.4 38 18 32 18z" fill="#FBF9FE" />
        <circle cx="32" cy="27.5" r="3.6" fill="#E58FA8" />
      </svg>
      {word && <span className="text-[1.15rem] font-extrabold tracking-tight text-violet-900">She Shield</span>}
    </span>
  );
}

/** Concentric protection rings around a shield; rings breathe when protection is on. */
export function ShieldRings({ on, size = 220 }: { on: boolean; size?: number }) {
  const id = useId().replace(/:/g, '');
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} aria-hidden>
      {[1, 0.78, 0.56].map((s, i) => (
        <motion.span
          key={s}
          className="absolute rounded-full border-2"
          style={{ width: size * s, height: size * s, borderColor: on ? `rgba(124,77,219,${0.18 + i * 0.12})` : 'rgba(166,159,184,.25)' }}
          animate={on ? { scale: [1, 1.04, 1], opacity: [0.9, 0.5, 0.9] } : { scale: 1, opacity: 1 }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
        />
      ))}
      <motion.svg width={size * 0.42} height={size * 0.42} viewBox="0 0 64 64" animate={on ? { y: [0, -3, 0] } : {}} transition={{ duration: 3, repeat: Infinity }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={on ? '#8E2DE2' : '#B9B2CC'} />
            <stop offset="1" stopColor={on ? '#3B1E77' : '#8A829F'} />
          </linearGradient>
        </defs>
        <path d={SHIELD} fill={`url(#${id})`} />
        <path d={on ? 'M22 32l7 7 14-15' : 'M24 32h16'} stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </motion.svg>
    </div>
  );
}

export function Beacon({ size = 56, color = '#E5383B' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M20 46h24l-3-18a9 9 0 00-18 0z" fill={color} />
      <rect x="16" y="46" width="32" height="7" rx="3" fill="#3B1E77" />
      <path d="M10 22l6 3M54 22l-6 3M32 8v6M16 12l4 5M48 12l-4 5" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="34" r="3.5" fill="#fff" opacity=".85" />
    </svg>
  );
}

export function SecurePin({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M32 6c-10 0-18 8-18 18 0 13 18 32 18 32s18-19 18-32c0-10-8-18-18-18z" fill="#3B82F6" />
      <circle cx="32" cy="24" r="10" fill="#fff" />
      <path d="M28 24v-3a4 4 0 018 0v3" stroke="#3B1E77" strokeWidth="2.5" fill="none" />
      <rect x="26" y="23" width="12" height="9" rx="2" fill="#3B1E77" />
    </svg>
  );
}

export function VaultArt({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect x="8" y="12" width="48" height="42" rx="8" fill="#4C2A9B" />
      <rect x="14" y="18" width="36" height="30" rx="5" fill="#E9E1FF" />
      <circle cx="32" cy="33" r="9" fill="#fff" stroke="#7C4DDB" strokeWidth="3" />
      <path d="M32 27v6l4 3" stroke="#7C4DDB" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="14" y="54" width="8" height="4" rx="2" fill="#3B1E77" />
      <rect x="42" y="54" width="8" height="4" rx="2" fill="#3B1E77" />
    </svg>
  );
}

export function CircleArt({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="26" fill="#F4F0FF" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="#B8A0FA" strokeWidth="2" strokeDasharray="3 5" />
      {[[32, 14], [48, 40], [16, 40]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="7" fill={['#7C4DDB', '#E58FA8', '#3B82F6'][i]} />
          <circle cx={x} cy={y - 1.6} r="2.4" fill="#fff" />
          <path d={`M${x - 4} ${y + 4.4}a4 3.4 0 018 0`} fill="#fff" />
        </g>
      ))}
      <path d="M32 26c-2.6 0-4.4 2-4.4 4.2C27.6 34 32 37 32 37s4.4-3 4.4-6.8C36.4 28 34.6 26 32 26z" fill="#3B1E77" />
    </svg>
  );
}

/** Onboarding scenes. */
export function SceneProtect() {
  return (
    <svg viewBox="0 0 320 220" className="w-full" aria-hidden>
      <rect width="320" height="220" rx="28" fill="#F4F0FF" />
      <circle cx="250" cy="52" r="20" fill="#FBE4EC" />
      <path d="M0 170h320v50H0z" fill="#E9E1FF" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={22 + i * 70} y={96 - (i % 2) * 18} width="44" height={80 + (i % 2) * 18} rx="6" fill="#D4C5FE" opacity=".7" />)}
      <motion.ellipse cx="160" cy="128" rx="70" ry="78" fill="none" stroke="#7C4DDB" strokeWidth="3" strokeDasharray="6 8" animate={{ rotate: 360 }} style={{ originX: '160px', originY: '128px' }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} />
      <ellipse cx="160" cy="128" rx="58" ry="66" fill="#8E2DE2" opacity=".1" />
      <circle cx="160" cy="88" r="14" fill="#3B1E77" />
      <path d="M140 170c0-28 8-58 20-58s20 30 20 58z" fill="#7C4DDB" />
      <path d="M150 104c4 6 16 6 20 0" fill="#3B1E77" />
      <rect x="172" y="128" width="12" height="20" rx="3" fill="#1E1533" />
      <rect x="174" y="131" width="8" height="12" rx="1.5" fill="#E58FA8" />
    </svg>
  );
}

export function SceneAlert() {
  return (
    <svg viewBox="0 0 320 220" className="w-full" aria-hidden>
      <rect width="320" height="220" rx="28" fill="#FFF0F3" />
      <rect x="118" y="36" width="84" height="150" rx="16" fill="#1E1533" />
      <rect x="124" y="46" width="72" height="130" rx="10" fill="#FBF9FE" />
      <motion.circle cx="160" cy="111" r="26" fill="#E5383B" animate={{ scale: [1, 1.08, 1] }} style={{ originX: '160px', originY: '111px' }} transition={{ duration: 1.4, repeat: Infinity }} />
      <text x="160" y="117" textAnchor="middle" fontWeight="800" fontSize="16" fill="#fff" fontFamily="sans-serif">SOS</text>
      {[[52, 70, '#7C4DDB'], [268, 84, '#3B82F6'], [64, 160, '#E58FA8'], [262, 156, '#2FBF8F']].map(([x, y, c], i) => (
        <g key={i}>
          <motion.path d={`M160 111L${x} ${y}`} stroke={c as string} strokeWidth="2" strokeDasharray="4 6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3 + i * 0.2, duration: 0.8 }} />
          <circle cx={x as number} cy={y as number} r="14" fill={c as string} />
          <circle cx={x as number} cy={(y as number) - 3} r="4" fill="#fff" />
          <path d={`M${(x as number) - 7} ${(y as number) + 8}a7 6 0 0114 0`} fill="#fff" />
        </g>
      ))}
    </svg>
  );
}

export function SceneReady() {
  return (
    <svg viewBox="0 0 320 220" className="w-full" aria-hidden>
      <rect width="320" height="220" rx="28" fill="#E8FAF3" />
      {['Location', 'Contacts', 'Network', 'Alerts'].map((t, i) => (
        <motion.g key={t} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 * i }}>
          <rect x="70" y={34 + i * 40} width="180" height="30" rx="12" fill="#fff" />
          <circle cx="90" cy={49 + i * 40} r="8" fill="#2FBF8F" />
          <path d={`M86 ${49 + i * 40}l3 3 5-6`} stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
          <text x="106" y={54 + i * 40} fontSize="13" fontWeight="700" fill="#1E1533" fontFamily="sans-serif">{t}</text>
        </motion.g>
      ))}
    </svg>
  );
}
