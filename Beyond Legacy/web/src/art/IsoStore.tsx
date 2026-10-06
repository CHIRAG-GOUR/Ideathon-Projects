// The homepage hero: a compact neighbourhood convenience store drawn in isometric projection (pure SVG — it looks 3D,
// it is not a 3D engine). Every fixture is a box projected from store coordinates, so depth and shading stay consistent.
// Slow Framer Motion touches: cooler glow, an AI scan sweeping the floor, gently pulsing markers. Reduced motion → static.
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { ART, shade } from './palette';

const S = 30; // px per store unit
const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
/** Store coordinates (x along the back wall, y along the left wall, z up) → screen. */
export const iso = (x: number, y: number, z = 0): [number, number] => [(x - y) * C30 * S, (x + y) * S30 * S - z * S];
const pts = (...ps: [number, number, number][]) => ps.map(([x, y, z]) => iso(x, y, z).map((v) => v.toFixed(1)).join(',')).join(' ');
const W = 11, D = 8, H = 4.2; // floor 11 × 8, wall height
const VB = { x: -258, y: -150, w: 586, h: 422 };
/** Where a store point lands, as % of the illustration box — for HTML overlays (markers, badges). */
export const isoPct = (x: number, y: number, z = 0) => {
  const [sx, sy] = iso(x, y, z);
  return { left: ((sx - VB.x) / VB.w) * 100, top: ((sy - VB.y) / VB.h) * 100 };
};

/** A solid box with lit top, mid-tone left-front face and darker right-front face. */
function Box({ x, y, z = 0, w, d, h, c, top, stroke = true }: { x: number; y: number; z?: number; w: number; d: number; h: number; c: string; top?: string; stroke?: boolean }) {
  const line = stroke ? { stroke: shade(c, -0.35), strokeWidth: 0.6, strokeLinejoin: 'round' as const } : {};
  return (
    <g>
      <polygon points={pts([x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h])} fill={shade(c, -0.08)} {...line} />
      <polygon points={pts([x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h])} fill={shade(c, -0.22)} {...line} />
      <polygon points={pts([x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h])} fill={top ?? shade(c, 0.12)} {...line} />
    </g>
  );
}
/** A flat rectangle on the face y = fy (facing the viewer, bottom-left). */
const FaceY = ({ fy, x, z, w, h, c, o = 1 }: { fy: number; x: number; z: number; w: number; h: number; c: string; o?: number }) => <polygon points={pts([x, fy, z], [x + w, fy, z], [x + w, fy, z + h], [x, fy, z + h])} fill={c} opacity={o} />;
/** A flat rectangle on the face x = fx (facing the viewer, bottom-right). */
const FaceX = ({ fx, y, z, d, h, c, o = 1 }: { fx: number; y: number; z: number; d: number; h: number; c: string; o?: number }) => <polygon points={pts([fx, y, z], [fx, y + d, z], [fx, y + d, z + h], [fx, y, z + h])} fill={c} opacity={o} />;

const GOODS = [ART.red, ART.yellow, ART.orange, '#3E8E6A', '#F4E3C3', '#2F6FB0', ART.red, '#7B4A2A', ART.yellow, '#E9EEF2'];
const good = (i: number) => GOODS[(i * 7 + 3) % GOODS.length];

/** Goods sitting on a shelf that faces +y: little boxes with real depth. */
function ShelfGoodsY({ x0, x1, y, z, depth = 0.5, seed = 0, tall = 0.42 }: { x0: number; x1: number; y: number; z: number; depth?: number; seed?: number; tall?: number }) {
  const items: ReactNode[] = [];
  let x = x0 + 0.08, i = seed;
  while (x < x1 - 0.3) {
    const w = 0.26 + ((i * 13) % 5) * 0.03, h = tall * (0.7 + ((i * 7) % 4) * 0.12);
    items.push(<Box key={i} x={x} y={y - depth} z={z} w={w} d={depth * 0.8} h={h} c={good(i)} stroke={false} />);
    x += w + 0.06;
    i++;
  }
  return <g>{items}</g>;
}
/** Goods on a shelf facing +x. */
function ShelfGoodsX({ y0, y1, x, z, depth = 0.5, seed = 0, tall = 0.42 }: { y0: number; y1: number; x: number; z: number; depth?: number; seed?: number; tall?: number }) {
  const items: ReactNode[] = [];
  let y = y0 + 0.08, i = seed;
  while (y < y1 - 0.3) {
    const d = 0.24 + ((i * 11) % 5) * 0.03, h = tall * (0.7 + ((i * 5) % 4) * 0.12);
    items.push(<Box key={i} x={x - depth} y={y} z={z} w={depth * 0.8} d={d} h={h} c={good(i + 2)} stroke={false} />);
    y += d + 0.06;
    i++;
  }
  return <g>{items}</g>;
}

function Sign({ x, y, z, w, text, c }: { x: number; y: number; z: number; w: number; text: string; c: string }) {
  // a hanging sign on the back wall (face y = 0.02)
  const [cx, cy] = iso(x + w / 2, y, z + 0.22);
  return (
    <g>
      <FaceY fy={y} x={x} z={z} w={w} h={0.5} c={c} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="9.5" fontWeight="800" letterSpacing="1.4" fill="#fff" transform={`skewY(30) translate(0 ${-Math.tan(Math.PI / 6) * cx})`} style={{ fontFamily: 'Inter Variable, sans-serif' }}>{text}</text>
    </g>
  );
}

export function IsoStore({ className, children, scan = true, title = 'Your store' }: { className?: string; children?: ReactNode; scan?: boolean; title?: string }) {
  const reduce = useReducedMotion();
  const tile: ReactNode[] = [];
  for (let i = 1; i < W; i++) tile.push(<polyline key={`a${i}`} points={pts([i, 0, 0], [i, D, 0])} stroke="#E3D3B4" strokeWidth="0.8" fill="none" />);
  for (let j = 1; j < D; j++) tile.push(<polyline key={`b${j}`} points={pts([0, j, 0], [W, j, 0])} stroke="#E3D3B4" strokeWidth="0.8" fill="none" />);
  const [gx, gy] = iso(0.9, 2.6, 2.2);
  return (
    <div className={`relative ${className ?? ''}`}>
      <svg viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} className="block h-auto w-full" role="img" aria-label={title}>
        <defs>
          <linearGradient id="iso-scan" x1="0" x2="1">
            <stop offset="0" stopColor={ART.yellow} stopOpacity="0" />
            <stop offset="0.5" stopColor={ART.yellow} stopOpacity="0.38" />
            <stop offset="1" stopColor={ART.yellow} stopOpacity="0" />
          </linearGradient>
          <radialGradient id="iso-glow"><stop offset="0" stopColor="#CFF3FF" stopOpacity="0.85" /><stop offset="1" stopColor="#CFF3FF" stopOpacity="0" /></radialGradient>
          <clipPath id="iso-floor"><polygon points={pts([0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0])} /></clipPath>
        </defs>

        {/* ground shadow + floor */}
        <polygon points={pts([0.3, 0.3, 0], [W + 0.5, 0.3, 0], [W + 0.5, D + 0.5, 0], [0.3, D + 0.5, 0])} fill="#000" opacity="0.10" transform="translate(0 8)" />
        <polygon points={pts([0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0])} fill="#F1E6CF" />
        <g clipPath="url(#iso-floor)">{tile}</g>
        <polygon points={pts([0, D, 0], [W, D, 0], [W, D, -0.35], [0, D, -0.35])} fill="#C9B48E" />
        <polygon points={pts([W, 0, 0], [W, D, 0], [W, D, -0.35], [W, 0, -0.35])} fill="#B39C74" />

        {/* walls */}
        <polygon points={pts([0, 0, 0], [W, 0, 0], [W, 0, H], [0, 0, H])} fill="#FBF5E9" />
        <polygon points={pts([0, 0, 0], [0, D, 0], [0, D, H], [0, 0, H])} fill="#F1E6D0" />
        <polygon points={pts([0, 0, H], [W, 0, H], [W, -0.3, H], [-0.3, -0.3, H])} fill={ART.greenDark} />
        <polygon points={pts([0, 0, H], [0, D, H], [-0.3, D, H], [-0.3, -0.3, H])} fill={shade(ART.greenDark, -0.15)} />
        <FaceY fy={0.01} x={0} z={H - 0.55} w={W} h={0.55} c={ART.green} />
        <FaceX fx={0.01} y={0} z={H - 0.55} d={D} h={0.55} c={shade(ART.green, -0.12)} />
        {Array.from({ length: 11 }, (_, i) => <FaceY key={i} fy={0.02} x={i} z={H - 0.55} w={0.5} h={0.55} c={ART.cream} o={0.9} />)}

        {/* window on the back wall */}
        <FaceY fy={0.02} x={8.1} z={1.4} w={2.4} h={1.6} c="#BFE3EE" />
        <FaceY fy={0.03} x={8.1} z={2.12} w={2.4} h={0.06} c="#fff" o={0.8} />
        <polygon points={pts([8.3, 0.03, 1.6], [8.9, 0.03, 2.9], [9.2, 0.03, 2.9], [8.6, 0.03, 1.6])} fill="#fff" opacity="0.45" />

        {/* signs */}
        <Sign x={0.6} y={0.03} z={3.05} w={2.6} text="SNACKS" c={ART.red} />
        <Sign x={4.6} y={0.03} z={3.05} w={2.6} text="BAKERY" c={ART.orange} />

        {/* back-wall shelving (faces +y) */}
        <Box x={0.4} y={0} w={3.4} d={0.9} h={2.7} c={ART.green} />
        <FaceY fy={0.9} x={0.5} z={0.15} w={3.2} h={2.45} c={shade(ART.green, -0.45)} />
        {[0.2, 0.95, 1.7].map((z, k) => (
          <g key={z}>
            <Box x={0.45} y={0.05} z={z} w={3.3} d={0.85} h={0.06} c="#C89B63" stroke={false} />
            <ShelfGoodsY x0={0.5} x1={3.7} y={0.9} z={z + 0.06} seed={k * 5} />
          </g>
        ))}

        {/* bakery case on the back wall */}
        <Box x={4.4} y={0} w={3.3} d={1.25} h={1.15} c={ART.orange} />
        <Box x={4.5} y={0.1} z={1.15} w={3.1} d={1.05} h={0.75} c="#D9F0F5" top="#EAF7FA" />
        {[0, 1, 2, 3, 4].map((i) => <Box key={i} x={4.65 + i * 0.6} y={0.4} z={1.2} w={0.42} d={0.42} h={0.26} c={i % 2 ? '#C98A4B' : '#E6B35E'} stroke={false} />)}
        <FaceY fy={1.26} x={4.5} z={0.3} w={3.1} h={0.5} c={shade(ART.orange, 0.25)} />

        {/* beverage cooler on the left wall (faces +x), with a slow glow */}
        <Box x={0} y={1.1} w={1.15} d={3.3} h={3.1} c="#1F3B33" />
        <FaceX fx={1.16} y={1.25} z={0.25} d={1.5} h={2.6} c="#A9DCEB" />
        <FaceX fx={1.16} y={2.85} z={0.25} d={1.4} h={2.6} c="#A9DCEB" />
        {[0.45, 1.15, 1.85].map((z, k) => <ShelfGoodsX key={z} y0={1.3} y1={4.2} x={1.15} z={z} depth={0.45} tall={0.48} seed={k * 4 + 1} />)}
        <motion.ellipse cx={gx} cy={gy} rx="58" ry="74" fill="url(#iso-glow)" initial={{ opacity: 0.35 }} animate={reduce ? undefined : { opacity: [0.25, 0.6, 0.25] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
        <FaceX fx={1.17} y={1.25} z={2.95} d={3} h={0.12} c="#fff" o={0.55} />

        {/* dairy chiller, lower, on the left wall */}
        <Box x={0} y={4.9} w={1.25} d={2.1} h={1.35} c="#DDEEF3" top="#F2FAFC" />
        <FaceX fx={1.26} y={5} z={0.2} d={1.9} h={0.35} c={ART.green} />
        {[0, 1, 2].map((i) => <Box key={i} x={0.25} y={5.15 + i * 0.6} z={1.36} w={0.7} d={0.42} h={0.22} c={i === 1 ? ART.yellow : '#FFFFFF'} stroke={false} />)}

        {/* centre gondola (goods on both visible faces) */}
        <Box x={3.2} y={3.3} w={4.3} d={1.3} h={1.7} c={ART.green} />
        {[0.15, 0.85].map((z, k) => (
          <g key={z}>
            <Box x={3.25} y={4.55} z={z} w={4.2} d={0.12} h={0.05} c="#C89B63" stroke={false} />
            <ShelfGoodsY x0={3.3} x1={7.4} y={4.66} z={z + 0.05} depth={0.4} seed={k * 7 + 3} tall={0.5} />
            <ShelfGoodsX y0={3.4} y1={4.5} x={7.62} z={z + 0.05} depth={0.4} seed={k * 3 + 9} tall={0.5} />
          </g>
        ))}
        <Box x={3.2} y={3.3} z={1.7} w={4.3} d={1.3} h={0.08} c="#C89B63" stroke={false} />
        {[0, 1, 2, 3, 4, 5].map((i) => <Box key={i} x={3.35 + i * 0.68} y={3.6} z={1.78} w={0.5} d={0.6} h={0.32} c={good(i + 5)} stroke={false} />)}

        {/* delivery cartons near the entrance */}
        <Box x={1.6} y={6.6} w={0.9} d={0.8} h={0.6} c="#C8995B" />
        <Box x={1.7} y={6.7} z={0.6} w={0.7} d={0.6} h={0.45} c="#D6AA6B" />
        <Box x={2.6} y={6.9} w={0.7} d={0.6} h={0.45} c="#BF8F52" />
        <polyline points={pts([1.6, 7.0, 0.6], [2.5, 7.0, 0.6])} stroke="#8C6435" strokeWidth="1.2" />

        {/* checkout counter + register + basket */}
        <Box x={8.2} y={4.8} w={2.2} d={1.1} h={1.15} c={ART.greenDark} />
        <FaceY fy={5.91} x={8.3} z={0.35} w={2} h={0.32} c={ART.yellow} />
        <Box x={9.4} y={5.0} z={1.15} w={0.65} d={0.55} h={0.35} c="#1E1B16" />
        <Box x={9.5} y={5.05} z={1.5} w={0.45} d={0.08} h={0.3} c="#2B2A26" />
        <Box x={8.45} y={5.05} z={1.15} w={0.75} d={0.6} h={0.28} c={ART.red} />
        <Box x={8.0} y={6.6} w={0.75} d={0.55} h={0.4} c={ART.red} />
        <polyline points={pts([8.05, 6.87, 0.4], [8.38, 6.87, 0.75], [8.7, 6.87, 0.4])} stroke={shade(ART.red, -0.3)} strokeWidth="1.6" fill="none" />

        {/* entrance mat */}
        <polygon points={pts([4.6, D - 0.05, 0.01], [6.6, D - 0.05, 0.01], [6.6, D - 1.0, 0.01], [4.6, D - 1.0, 0.01])} fill={ART.red} opacity="0.9" />

        {/* the AI scan: a soft band that sweeps across the floor, slowly */}
        {scan && !reduce && (
          <g clipPath="url(#iso-floor)">
            <motion.polygon
              points={pts([-1.2, -1, 0], [0, -1, 0], [0, D + 1, 0], [-1.2, D + 1, 0])}
              fill="url(#iso-scan)"
              initial={{ x: -40 }}
              animate={{ x: [-40, 420] }}
              transition={{ duration: 7, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
            />
          </g>
        )}
      </svg>
      {children && <div className="pointer-events-none absolute inset-0">{children}</div>}
    </div>
  );
}

/** Anchor points (store coordinates) for overlays: the four zones of the scene. */
export const ISO_ZONES = {
  cooler: isoPct(0.3, 4.6, 3.3),
  shelves: isoPct(2.7, 0.3, 3.05),
  bakery: isoPct(6.8, 0.5, 2.25),
  gondola: isoPct(5.0, 4.0, 2.2),
  checkout: isoPct(9.4, 5.4, 1.9),
};

/** A small floating status marker for the hero scene. */
export function IsoMarker({ at, tone, label, pulse, delay = 0 }: { at: { left: number; top: number }; tone: 'red' | 'yellow' | 'green' | 'orange' | 'ai'; label: string; pulse?: boolean; delay?: number }) {
  const reduce = useReducedMotion();
  const bg = { red: 'bg-red text-white', yellow: 'bg-yellow text-ink', green: 'bg-green text-white', orange: 'bg-orange text-white', ai: 'bg-ink text-white' }[tone];
  return (
    <motion.div
      className="absolute -translate-x-1/2 -translate-y-full"
      style={{ left: `${at.left}%`, top: `${at.top}%` }}
      initial={{ opacity: 0, y: 6 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: [0, -4, 0] }}
      transition={reduce ? { delay } : { opacity: { delay, duration: 0.4 }, y: { delay, duration: 4, repeat: Infinity, ease: 'easeInOut' } }}
    >
      <span className={`relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide shadow-lift sm:text-[11px] ${bg}`}>
        <span className="relative flex h-2 w-2">
          {pulse && <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-white" />}
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
        {label}
      </span>
      <span className="mx-auto block h-2.5 w-px bg-ink/40" aria-hidden />
    </motion.div>
  );
}
