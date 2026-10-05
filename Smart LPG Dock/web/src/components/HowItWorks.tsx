import { motion } from 'framer-motion';
import type { SimState } from '@engine/engine';
import { IconAlert, IconChart, IconContained, IconCylinder, IconDock, IconGas, IconShield, IconValve } from '@/assets/art';
import { cx } from './ui';

const STEPS = [
  { t: 'LPG cylinder', d: 'Supplies the stove through the regulator', icon: <IconCylinder /> },
  { t: 'Smart Dock', d: 'Sits under the cylinder; carries the sensors', icon: <IconDock /> },
  { t: 'Sensors', d: 'Gas · temperature · tilt · weight/flow', icon: <IconGas /> },
  { t: 'Data', d: 'Readings every 50 ms (simulated)', icon: <IconChart /> },
  { t: 'Safety engine', d: 'Thresholds → anomaly / warning / critical', icon: <IconShield /> },
  { t: 'Alert', d: 'Beacon, sound, app — the chef is warned early', icon: <IconAlert /> },
  { t: 'Simulated shutoff', d: 'Actuator isolates the LPG supply', icon: <IconValve /> },
  { t: 'Incident contained', d: 'Gas clears; state returns to SAFE', icon: <IconContained /> },
];

/** Which stage the live simulation is in (so the diagram follows the real engine). */
export function liveStage(s?: SimState): number {
  if (!s || s.scenario !== 'with') return -1;
  switch (s.phase) {
    case 'IDLE': return 1;
    case 'COOKING': return 3;
    case 'ANOMALY': return 4;
    case 'WARNING':
    case 'CRITICAL': return 5;
    case 'RESPONSE': return 6;
    case 'CONTAINED': return 7;
    default: return -1;
  }
}

export function HowItWorks({ s, compact }: { s?: SimState; compact?: boolean }) {
  const live = liveStage(s);
  return (
    <ol className={cx('grid gap-2', compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4')}>
      {STEPS.map((x, i) => {
        const on = live >= 0 ? i <= live : true;
        const cur = i === live;
        return (
          <motion.li
            key={x.t}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className={cx('relative flex items-start gap-3 rounded-xl2 p-3 ring-1 transition-colors', cur ? 'bg-lpg-600 text-white ring-lpg-600' : on ? 'bg-white ring-line' : 'bg-cream-100 ring-line opacity-60')}
            aria-current={cur ? 'step' : undefined}
          >
            <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-lg', cur ? 'bg-white/15' : i === 7 ? 'bg-ok-50 text-ok-600' : i === 5 ? 'bg-safety-50 text-safety-600' : 'bg-lpg-50 text-lpg-600')}>{x.icon}</span>
            <span className="min-w-0">
              <span className={cx('block font-mono text-[10px] font-bold', cur ? 'text-lpg-100' : 'text-graphite-faint')}>STEP {i + 1}{cur && ' · LIVE'}</span>
              <span className="block text-[14px] font-extrabold leading-tight">{x.t}</span>
              {!compact && <span className={cx('mt-0.5 block text-[12px] leading-snug', cur ? 'text-lpg-50' : 'text-graphite-muted')}>{x.d}</span>}
            </span>
            {cur && <motion.span layoutId="flowpulse" className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-safety-400 ring-2 ring-white" />}
          </motion.li>
        );
      })}
    </ol>
  );
}
