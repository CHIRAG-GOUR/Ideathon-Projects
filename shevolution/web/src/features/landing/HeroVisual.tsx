'use client';
import { motion } from 'framer-motion';
import { E3d } from '@/components/ui';

/** Illustrated hero: phone with the SOS ring, a live-map card and a contact-alert card. Pure SVG/CSS — no photos. */
export function HeroVisual() {
  return (
    <div className="relative mx-auto h-[520px] w-full max-w-[460px]">
      <motion.div className="absolute left-6 top-10 h-72 w-72 rounded-full bg-sos-200/60 blur-3xl" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 6, repeat: Infinity }} />
      <motion.div className="absolute bottom-6 right-2 h-60 w-60 rounded-full bg-blush-200 blur-3xl" animate={{ scale: [1.1, 1, 1.1] }} transition={{ duration: 7, repeat: Infinity }} />

      {/* Phone */}
      <div className="absolute left-1/2 top-4 w-[250px] -translate-x-1/2">
      <motion.div initial={{ y: 30, opacity: 0, rotate: -2 }} animate={{ y: 0, opacity: 1, rotate: -2 }} transition={{ type: 'spring', stiffness: 120, damping: 16 }} className="rounded-[42px] border-[10px] border-ink bg-paper p-4 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-ink/80" />
        <p className="text-center text-lg font-extrabold leading-tight">
          You&apos;re <span className="text-sos-500">not alone.</span>
        </p>
        <p className="text-center text-[10px] text-ink-muted">One hold can alert the people who matter.</p>
        <div className="relative mx-auto my-4 grid h-40 w-40 place-items-center">
          <motion.span className="absolute inset-0 rounded-full bg-sos-300/40" animate={{ scale: [1, 1.18, 1], opacity: [0.8, 0, 0.8] }} transition={{ duration: 2.2, repeat: Infinity }} />
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r="46" fill="none" stroke="#FFE0E6" strokeWidth="5" />
            <motion.circle cx="50" cy="50" r="46" fill="none" stroke="#F02452" strokeWidth="5" strokeLinecap="round" strokeDasharray="289" animate={{ strokeDashoffset: [289, 0, 0, 289] }} transition={{ duration: 4.5, repeat: Infinity, times: [0, 0.6, 0.85, 1] }} />
          </svg>
          <div className="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-sos-400 to-sos-700 text-white shadow-glow">
            <div className="text-center">
              <p className="text-3xl font-extrabold leading-none">SOS</p>
              <p className="text-[9px] font-semibold opacity-85">Hold for 3 seconds</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {[
            ['woman-walking', 'Safe Trip'],
            ['wave', 'Check In'],
            ['police', 'Nearby Help'],
          ].map(([i, l]) => (
            <div key={l} className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-soft">
              <E3d name={i} size={22} />
              <span className="text-xs font-bold">{l}</span>
            </div>
          ))}
        </div>
      </motion.div>
      </div>

      {/* Live map card */}
      <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.35, type: 'spring' }} className="absolute -right-2 top-40 w-48 rounded-3xl bg-white p-3 shadow-soft">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-extrabold">Live location</p>
          <span className="flex items-center gap-1 text-[10px] font-bold text-sos-600">
            <motion.span className="h-1.5 w-1.5 rounded-full bg-sos-500" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />
            LIVE
          </span>
        </div>
        <svg viewBox="0 0 160 100" className="mt-2 w-full rounded-2xl bg-blush-50">
          <path d="M0 70 L160 40 M20 0 L60 100 M100 0 L130 100" stroke="#fff" strokeWidth="8" />
          <path d="M0 70 L160 40 M20 0 L60 100 M100 0 L130 100" stroke="#F2DFE3" strokeWidth="1" />
          <motion.path d="M30 88 Q60 70 80 62 T118 44" fill="none" stroke="#F02452" strokeWidth="3" strokeDasharray="3 6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1 }} />
          <circle cx="118" cy="44" r="14" fill="#F02452" opacity=".15" />
          <circle cx="118" cy="44" r="6" fill="#F02452" stroke="#fff" strokeWidth="2.5" />
        </svg>
        <p className="num mt-2 text-[10px] font-semibold text-ink-muted">28.63153, 77.21671 · ±12 m</p>
      </motion.div>

      {/* Contact alert card */}
      <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.55, type: 'spring' }} className="absolute bottom-10 -left-2 w-52 rounded-3xl bg-white p-3 shadow-soft">
        <p className="text-[11px] font-extrabold">Safety Circle</p>
        {[
          ['M', 'Mom', 'ALERTED'],
          ['R', 'Rahul', 'ALERTED'],
        ].map(([a, n, s], i) => (
          <motion.div key={n} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 + i * 0.35 }} className="mt-2 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-sos-100 text-xs font-extrabold text-sos-700">{a}</span>
            <span className="flex-1 text-xs font-bold">{n}</span>
            <span className="text-[10px] font-extrabold text-safe-600">✓ {s}</span>
          </motion.div>
        ))}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} className="mt-2 rounded-xl bg-safe-50 px-2 py-1 text-[10px] font-bold text-safe-600">
          💚 Mom is responding
        </motion.p>
      </motion.div>

      <motion.div className="absolute bottom-2 right-10" animate={{ y: [0, -10, 0] }} transition={{ duration: 3.2, repeat: Infinity }}>
        <E3d name="woman-walking" size={92} />
      </motion.div>
      <motion.div className="absolute left-8 top-0" animate={{ y: [0, 8, 0], rotate: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity }}>
        <E3d name="shield" size={54} />
      </motion.div>
    </div>
  );
}
