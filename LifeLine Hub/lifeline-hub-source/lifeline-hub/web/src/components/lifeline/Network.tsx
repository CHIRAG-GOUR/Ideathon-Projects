'use client';
/**
 * The LifeLine network (YOU at the centre, linked to ambulance, hospital, family, police, fire and LifeLine
 * Helpers — each with a real status where one exists) and the Incident → Care chain built on the four pillars.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { Fragment, type ReactNode } from 'react';
import { useApp, type Screen } from '@/ctx';
import { Icon, type IconName } from '@/ui/icons';
import { cx, Honest } from '@/ui/kit';
import { fmtEta, fmtKm, type RadarKind } from '@/services/georadar/radar';

interface Node { key: string; label: string; icon: IconName; color: string; x: number; y: number; status: string; sub: string; go: Screen; honest?: 'simulated' | 'estimated' }

export function LifeLineNetwork({ className, emergency }: { className?: string; emergency?: boolean }) {
  const { radar, contacts, lines, demo, nav, fix } = useApp();
  const reduce = useReducedMotion();
  const nearest = (k: RadarKind) => radar.points?.find((p) => p.kind === k);
  const num = (k: string) => lines.find((l) => l.key === k)?.number ?? '112';
  const h = nearest('hospital'), po = nearest('police'), am = nearest('ambulance'), helpers = radar.points?.filter((p) => p.kind === 'helper') ?? [];
  const nodes: Node[] = [
    { key: 'ambulance', label: 'Ambulance', icon: 'ambulance', color: '#FF5A64', x: 50, y: 13, status: am ? `${fmtKm(am.distance)} away` : `Call ${num('ambulance')}`, sub: am ? 'Nearest unit' : 'Public ambulance line', go: 'services', honest: am ? 'simulated' : undefined },
    { key: 'hospital', label: 'Hospital', icon: 'hospital', color: '#22D3EE', x: 84, y: 32, status: h ? fmtKm(h.distance) : fix ? 'Searching…' : 'Location off', sub: h ? `~${fmtEta(h.etaMin)} drive` : 'Nearest emergency care', go: 'radar', honest: h ? (h.source === 'demo' ? 'simulated' : 'estimated') : undefined },
    { key: 'family', label: 'Family', icon: 'family', color: '#3DBB7E', x: 84, y: 70, status: contacts.length ? `${contacts.length} contact${contacts.length > 1 ? 's' : ''}` : 'None yet', sub: contacts.length ? 'Alerted on SOS' : 'Add who to alert', go: 'contacts' },
    { key: 'helpers', label: 'Helpers', icon: 'helper', color: '#5FD0C9', x: 50, y: 86, status: demo ? `${helpers.length} nearby` : 'Pilot', sub: demo ? 'Verified community' : 'Not live in your area', go: 'helpers', honest: demo ? 'simulated' : undefined },
    { key: 'fire', label: 'Fire', icon: 'fire', color: '#F5B544', x: 16, y: 70, status: `Call ${num('fire')}`, sub: 'Fire & rescue', go: 'services' },
    { key: 'police', label: 'Police', icon: 'police', color: '#8C7CF3', x: 16, y: 32, status: po ? fmtKm(po.distance) : `Call ${num('police')}`, sub: po ? 'Nearest station' : 'Police emergency', go: po ? 'radar' : 'services', honest: po?.source === 'demo' ? 'simulated' : undefined },
  ];
  const accent = emergency ? '#FF5A64' : '#22D3EE';
  return (
    <div className={cx('relative aspect-[1.1] w-full', className)}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          {nodes.map((n) => (
            <linearGradient key={n.key} id={`nl-${n.key}`} gradientUnits="userSpaceOnUse" x1="50" y1="50" x2={n.x} y2={n.y}>
              <stop offset="0" stopColor={accent} stopOpacity=".9" /><stop offset="1" stopColor={n.color} stopOpacity=".7" />
            </linearGradient>
          ))}
        </defs>
        {/* orbit */}
        <ellipse cx="50" cy="50" rx="38" ry="40" fill="none" stroke="#7DE7FA" strokeOpacity=".08" strokeWidth=".3" />
        <ellipse cx="50" cy="50" rx="22" ry="23" fill="none" stroke="#7DE7FA" strokeOpacity=".08" strokeWidth=".3" strokeDasharray="1 1.5" />
        {nodes.map((n, i) => {
          const d = `M50 50 L${n.x} ${n.y}`;
          return (
            <g key={n.key}>
              <path d={d} stroke={`url(#nl-${n.key})`} strokeWidth=".45" fill="none" strokeDasharray="1.4 1.4" className={reduce ? '' : 'animate-flow'} vectorEffect="non-scaling-stroke" style={{ strokeWidth: 1.4 }} />
              {!reduce && (
                <circle r="0.9" fill={n.color}>
                  <animateMotion dur={`${2.6 + (i % 3) * 0.4}s`} begin={`${i * 0.45}s`} repeatCount="indefinite" path={d} />
                  <animate attributeName="opacity" values="0;1;1;0" dur={`${2.6 + (i % 3) * 0.4}s`} begin={`${i * 0.45}s`} repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}
      </svg>
      {/* YOU */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative grid h-24 w-24 place-items-center">
          {!reduce && [0, 1, 2].map((i) => <motion.span key={i} className="absolute inset-0 rounded-full border" style={{ borderColor: accent }} initial={{ scale: 0.5, opacity: 0.6 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 3, repeat: Infinity, delay: i }} />)}
          <span className="absolute inset-3 rounded-full" style={{ background: `radial-gradient(closest-side, ${accent}55, transparent)` }} />
          <span className="relative grid h-14 w-14 place-items-center rounded-full bg-midnight-900 ring-2 ring-white/80 shadow-glow">
            <span className="text-center">
              <Icon name="location" size={18} className="mx-auto text-cyan-300" />
              <span className="block font-mono text-[9px] font-bold tracking-[0.16em] text-white">YOU</span>
            </span>
          </span>
        </div>
      </div>
      {nodes.map((n, i) => (
        <motion.button
          key={n.key}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 260, damping: 22 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => nav.tab(n.go)}
          className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
          aria-label={`${n.label}: ${n.status}`}
        >
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl glass-dark ring-1 sm:h-12 sm:w-12" style={{ color: n.color, boxShadow: `0 0 22px ${n.color}40`, ['--tw-ring-color' as string]: `${n.color}66` }}>
            <Icon name={n.icon} size={21} />
          </span>
          <span className="mt-1 block whitespace-nowrap text-[11.5px] font-semibold text-white">{n.label}</span>
          <span className="block whitespace-nowrap font-mono text-[10px] text-midnight-200">{n.status}</span>
          {n.honest && <span className="mt-0.5 hidden sm:block"><Honest dark kind={n.honest} /></span>}
        </motion.button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------- the chain
const PILLARS: { s: Screen; icon: IconName; t: string; d: string; c: string }[] = [
  { s: 'vault', icon: 'vault', t: 'Health Vault', d: 'Give responders the context they need.', c: '#22B8B0' },
  { s: 'radar', icon: 'radar', t: 'Geo-Radar', d: 'See where help is and how fast it can reach you.', c: '#22D3EE' },
  { s: 'guidance', icon: 'ai', t: 'AI Guidance', d: 'Know what to do while help is coming.', c: '#8C7CF3' },
];

/** INCIDENT → SOS PUSH → (VAULT · RADAR · GUIDANCE) → RESPONSE → CARE */
export function PillarChain({ active }: { active?: number }) {
  const { nav } = useApp();
  const reduce = useReducedMotion();
  const Node = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cx('relative rounded-3xl p-4', className)}>{children}</div>;
  const Arrow = ({ v }: { v?: boolean }) => (
    <div className={cx('flex items-center justify-center', v ? 'h-8' : 'w-8 lg:h-auto')} aria-hidden>
      <svg viewBox="0 0 24 24" className={cx('h-6 w-6 text-teal-400', v ? 'rotate-90' : 'rotate-90 lg:rotate-0')}><path d="M4 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" className={reduce ? '' : 'animate-pulse'} /></svg>
    </div>
  );
  return (
    <div className="flex flex-col items-stretch gap-1 lg:flex-row lg:items-center">
      <Node className="bg-clinic-100 ring-1 ring-inset ring-line lg:w-[150px]">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">Incident</p>
        <p className="mt-1 text-[13px] text-ink-soft">Accident, collapse, chest pain, danger.</p>
      </Node>
      <Arrow />
      <motion.button whileHover={{ y: -2 }} onClick={() => nav.tab('sos')} className="rounded-3xl bg-midnight-900 p-4 text-left text-white ring-1 ring-coral-500/30 lg:w-[180px]">
        <span className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-coral-500/20 text-coral-300"><Icon name="sos" size={18} /></span><b className="font-display text-[15px]">SOS Push</b></span>
        <span className="mt-1.5 block text-[12.5px] text-midnight-200">Get help moving. One hold starts the response.</span>
      </motion.button>
      <Arrow />
      <div className="relative grid flex-1 gap-2">
        {PILLARS.map((p, i) => (
          <motion.button key={p.s} whileHover={{ x: 3 }} onClick={() => nav.tab(p.s)} className={cx('relative flex items-center gap-3 rounded-3xl bg-white p-3 text-left ring-1 ring-inset transition-shadow hover:shadow-panel', active === i ? 'ring-2' : 'ring-line')} style={active === i ? { ['--tw-ring-color' as string]: p.c } : undefined}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${p.c}1A`, color: p.c }}><Icon name={p.icon} size={19} /></span>
            <span className="min-w-0"><b className="block font-display text-[15px] text-ink">{p.t}</b><span className="block text-[12.5px] leading-snug text-ink-muted">{p.d}</span></span>
          </motion.button>
        ))}
      </div>
      <Arrow />
      {[{ t: 'Response', d: 'Contacts, helpers and emergency services move.', i: 'ambulance' as IconName }, { t: 'Care', d: 'The right hospital, with the right context.', i: 'hospital' as IconName }].map((n, i) => (
        <Fragment key={n.t}>
          {i === 1 && <Arrow />}
          <Node className={cx('ring-1 ring-inset lg:w-[150px]', i ? 'bg-teal-500 text-white ring-teal-500' : 'bg-teal-50 ring-teal-200')}>
            <span className="flex items-center gap-2"><Icon name={n.i} size={17} className={i ? 'text-white' : 'text-teal-600'} /><b className="font-display text-[14px]">{n.t}</b></span>
            <span className={cx('mt-1 block text-[12px] leading-snug', i ? 'text-teal-50' : 'text-ink-muted')}>{n.d}</span>
          </Node>
        </Fragment>
      ))}
    </div>
  );
}
