// 2D fallback (no WebGL, or the 3D view failed): the same engine state as a schematic, still fully readable.
import type { SimController } from '@/simulation/controller';
import { useSim } from '@/simulation/useSim';
import { CONFIG } from '@engine/engine';

const X = (x: number) => 200 + x * 52;
const Z = (z: number) => 70 + z * 52;

export function KitchenFallback({ sim }: { sim: SimController }) {
  const s = useSim(sim, 10);
  const k = CONFIG.kitchen;
  const gasR = Math.max(0, (s.gas - 0.05) / 0.75) * 140;
  const led = s.safety === 'SAFE' ? '#22c55e' : s.supply === 'ISOLATED' ? '#3b82f6' : s.alarm === 'critical' ? '#ef4444' : s.alarm === 'warning' ? '#f59e0b' : '#22c55e';
  const inc = s.timers.incidentAt >= 0;
  return (
    <svg viewBox="0 0 420 260" className="h-full w-full bg-cream" aria-hidden>
      <text x="12" y="20" fontSize="10" fontWeight="700" fill="#5E6977">2D VIEW (3D unavailable on this device) · top-down schematic</text>
      <rect x={X(-3)} y={Z(-1.5)} width={52 * 6} height={52 * 4.4} fill="#efe6d6" stroke="#9aa4b1" />
      <rect x={X(-3) - 4} y={Z(1.22)} width="8" height={52 * 1.16} fill="#167A45" />
      <text x={X(-3) - 30} y={Z(1.9)} fontSize="9" fill="#167A45" fontWeight="700">EXIT</text>
      <rect x={X(-2.7)} y={Z(-1.45)} width={52 * 3.65} height={52 * 0.65} fill="#3b4656" />
      <rect x={X(-0.45)} y={Z(-1.35)} width={52 * 0.9} height={52 * 0.5} fill="#1f2733" stroke="#5aa9ff" strokeWidth={s.burner ? 2 : 0} />
      <text x={X(-0.4)} y={Z(-0.9) + 12} fontSize="9" fill="#1F2733">stove {s.burner ? '(on)' : '(off)'}</text>
      <circle cx={X(k.cylinder[0])} cy={Z(k.cylinder[2])} r={gasR} fill="#d8e27a" opacity={inc ? 0 : 0.35} />
      {s.dock === 'CONNECTED' && <rect x={X(k.cylinder[0]) - 16} y={Z(k.cylinder[2]) - 16} width="32" height="32" rx="4" fill="#9aa4b1" stroke={led} strokeWidth="4" />}
      <circle cx={X(k.cylinder[0])} cy={Z(k.cylinder[2])} r="10" fill={inc ? '#3a3f47' : '#2563B0'} />
      <circle cx={X(s.chef.x)} cy={Z(s.chef.z)} r="9" fill="#fff" stroke="#183F73" strokeWidth="3" />
      <text x={X(s.chef.x) + 12} y={Z(s.chef.z) + 4} fontSize="9" fill="#1F2733" fontWeight="700">chef · {s.chef.action}</text>
      {inc && <circle cx={X(k.cylinder[0])} cy={Z(k.cylinder[2])} r="60" fill="#ff7a1a" opacity="0.5" />}
    </svg>
  );
}
