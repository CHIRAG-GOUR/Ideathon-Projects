// Product illustration family. One 100×100 stage, light from the upper left, a soft floor shadow, cylindrical
// gradients for round packaging and three-face shading for boxes — so every product reads as the same set.
import { useId, type ReactNode } from 'react';
import { ART, shade } from './palette';

type Base = { size?: number; className?: string; title?: string };

function useIds(n: number) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return Array.from({ length: n }, (_, i) => `${id}-${i}`);
}

function Stage({ size = 64, className, title, children, defs }: Base & { children: ReactNode; defs?: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {defs && <defs>{defs}</defs>}
      <ellipse cx="50" cy="92" rx="27" ry="4.6" fill={ART.shadow} opacity="0.13" />
      {children}
    </svg>
  );
}

/** Left-to-right cylinder shading: dark rim, lit face, specular band, falloff. */
function Cyl({ id, c }: { id: string; c: string }) {
  return (
    <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stopColor={shade(c, -0.3)} />
      <stop offset="0.22" stopColor={c} />
      <stop offset="0.42" stopColor={shade(c, 0.28)} />
      <stop offset="0.62" stopColor={c} />
      <stop offset="1" stopColor={shade(c, -0.38)} />
    </linearGradient>
  );
}

function Vert({ id, top, bottom }: { id: string; top: string; bottom: string }) {
  return (
    <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stopColor={top} />
      <stop offset="1" stopColor={bottom} />
    </linearGradient>
  );
}

const Shine = ({ d, w = 3, o = 0.5 }: { d: string; w?: number; o?: number }) => <path d={d} stroke="#fff" strokeWidth={w} strokeLinecap="round" fill="none" opacity={o} />;

// ------------------------------------------------------------------ drinks

export function Bottle({ liquid = ART.blue, cap = ART.blue, label = ART.white, accent = ART.green, clear = true, ...b }: Base & { liquid?: string; cap?: string; label?: string; accent?: string; clear?: boolean }) {
  const [body, capG, lab] = useIds(3);
  const outline = 'M43 13h14v5c0 3.5 7 6.5 8 13v52a6 6 0 0 1-6 6H41a6 6 0 0 1-6-6V31c1-6.5 8-9.5 8-13z';
  return (
    <Stage {...b} defs={<><Cyl id={body} c={clear ? shade(liquid, 0.55) : liquid} /><Cyl id={capG} c={cap} /><Cyl id={lab} c={label} /></>}>
      <path d={outline} fill={`url(#${body})`} />
      {clear && <path d="M37 40h26v43a5 5 0 0 1-5 5H42a5 5 0 0 1-5-5z" fill={liquid} opacity="0.35" />}
      <rect x="41.5" y="5" width="17" height="10" rx="2.2" fill={`url(#${capG})`} />
      {[45, 48.5, 52, 55.5].map((x) => <line key={x} x1={x} x2={x} y1="6.5" y2="13.5" stroke={shade(cap, -0.35)} strokeWidth="0.9" opacity="0.6" />)}
      <rect x="35" y="48" width="30" height="24" fill={`url(#${lab})`} />
      <rect x="35" y="48" width="30" height="3.2" fill={accent} />
      <rect x="35" y="68.8" width="30" height="3.2" fill={accent} opacity="0.85" />
      <circle cx="50" cy="58.5" r="5" fill={accent} />
      <path d="M47.6 58.6l1.7 1.7 3.3-3.6" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="43" y="65" width="14" height="1.6" rx=".8" fill={shade(accent, -0.2)} opacity=".5" />
      <Shine d="M39.5 34v46" w={2.6} o={0.55} />
      <Shine d="M42 22.5c-1.5 2-3 3.4-4 5.5" w={1.6} o={0.5} />
    </Stage>
  );
}

export function Can({ color = ART.red, accent = ART.yellow, ...b }: Base & { color?: string; accent?: string }) {
  const [body, rim] = useIds(2);
  return (
    <Stage {...b} defs={<><Cyl id={body} c={color} /><Cyl id={rim} c={ART.metal} /></>}>
      <path d="M33 22h34v62c0 2.8-7.6 5-17 5s-17-2.2-17-5z" fill={`url(#${body})`} />
      <path d="M33 80c0 2.8 7.6 5 17 5s17-2.2 17-5v4c0 2.8-7.6 5-17 5s-17-2.2-17-5z" fill={`url(#${rim})`} />
      <path d="M33 22c0-4 7.6-7 17-7s17 3 17 7v4c0 2.8-7.6 5-17 5s-17-2.2-17-5z" fill={`url(#${rim})`} />
      <ellipse cx="50" cy="19.5" rx="14" ry="3.6" fill={shade(ART.metal, -0.25)} />
      <ellipse cx="50" cy="19" rx="12" ry="2.8" fill={shade(ART.metal, 0.2)} />
      <path d="M46 18.4h7.5a1.8 1.8 0 0 1 0 3.2H47" stroke={shade(ART.metal, -0.45)} strokeWidth="1.2" fill="none" />
      <path d="M33 52c8-6 26-12 34-10v13c-10-2-26 4-34 11z" fill={accent} opacity="0.95" />
      <path d="M33 62c8-5 25-11 34-9v3c-9-1.5-25 4-34 9.5z" fill="#fff" opacity="0.65" />
      <circle cx="50" cy="40" r="6" fill="#fff" opacity="0.9" />
      <circle cx="50" cy="40" r="3.6" fill={color} />
      <Shine d="M38.5 30v48" w={3} o={0.45} />
    </Stage>
  );
}

export function ColdCoffee(b: Base) {
  const [cup, coffee, lid] = useIds(3);
  return (
    <Stage {...b} defs={<>
      <linearGradient id={cup} x1="0" x2="1"><stop offset="0" stopColor="#E6EEEC" /><stop offset=".45" stopColor="#FFFFFF" /><stop offset="1" stopColor="#D2DEDB" /></linearGradient>
      <Vert id={coffee} top={ART.caramel} bottom={ART.coffee} />
      <radialGradient id={lid} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset="1" stopColor="#DCE7E4" stopOpacity=".7" /></radialGradient>
    </>}>
      <path d="M58 6l-5 30" stroke={ART.green} strokeWidth="4.2" strokeLinecap="round" />
      <path d="M58 6l-5 30" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity=".35" />
      <path d="M31 36h38l-5 50a4 4 0 0 1-4 3.6H40a4 4 0 0 1-4-3.6z" fill={`url(#${cup})`} />
      <path d="M33.5 46h33l-3.8 39a3 3 0 0 1-3 2.6H40.3a3 3 0 0 1-3-2.6z" fill={`url(#${coffee})`} />
      <path d="M33.5 46c6 3 11-2 16.5 0s11 3 16.5 0v5c-6 3-11-1-16.5-1s-11 4-16.5 1z" fill="#F3E3C8" opacity=".95" />
      {[[40, 60], [52, 56], [46, 70], [57, 68]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="7" height="7" rx="1.6" fill="#fff" opacity=".28" transform={`rotate(12 ${x} ${y})`} />)}
      <rect x="35.4" y="62" width="29.2" height="12" fill={ART.greenDark} opacity=".92" />
      <circle cx="50" cy="68" r="3.6" fill={ART.yellow} />
      <path d="M28 36c0-6 10-10 22-10s22 4 22 10z" fill={`url(#${lid})`} />
      <rect x="27" y="35" width="46" height="4" rx="2" fill="#E3ECE9" />
      <Shine d="M36.5 41l2.6 40" w={2.4} o={0.7} />
    </Stage>
  );
}

export function Carton({ color = ART.blue, top = ART.white, label = 'MILK', ...b }: Base & { color?: string; top?: string; label?: string }) {
  const [front, side] = useIds(2);
  return (
    <Stage {...b} defs={<><Vert id={front} top={shade(top, 0)} bottom={shade(top, -0.06)} /><Vert id={side} top={shade(top, -0.14)} bottom={shade(top, -0.22)} /></>}>
      <path d="M33 34h24v54H33z" fill={`url(#${front})`} />
      <path d="M57 34l11-5v53l-11 6z" fill={`url(#${side})`} />
      <path d="M33 34l5-14h19l-5 14z" fill={shade(top, -0.04)} />
      <path d="M57 34l11-5-5-14-6 5z" fill={shade(top, -0.18)} />
      <path d="M38 20h19l6-5H44z" fill={shade(top, -0.1)} />
      <rect x="40" y="14.5" width="16" height="3" fill={shade(top, -0.12)} />
      <circle cx="62" cy="26" r="3.2" fill={color} />
      <path d="M33 58h24v22H33z" fill={color} />
      <path d="M57 58l11-5v21l-11 6z" fill={shade(color, -0.25)} />
      <path d="M33 58c6-4 12 3 24-2" stroke="#fff" strokeWidth="2" fill="none" opacity=".85" />
      <text x="45" y="50" textAnchor="middle" fontSize="7.4" fontWeight="800" fontFamily="system-ui, sans-serif" fill={color}>{label}</text>
      <circle cx="45" cy="70" r="5" fill="#fff" opacity=".92" />
      <path d="M42.5 70.5l1.8 1.8 3.4-3.8" stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <Shine d="M36 38v46" w={2} o={0.6} />
    </Stage>
  );
}

// ------------------------------------------------------------------ dairy & chilled

export function Tub({ color = ART.blue, lid = ART.white, ...b }: Base & { color?: string; lid?: string }) {
  const [body, foil] = useIds(2);
  return (
    <Stage {...b} defs={<><Cyl id={body} c={ART.paper} /><Cyl id={foil} c={lid} /></>}>
      <path d="M26 42h48l-6 42c-.4 3-8 5-18 5s-17.6-2-18-5z" fill={`url(#${body})`} />
      <path d="M27.6 54h44.8l-1.8 13H29.4z" fill={color} />
      <path d="M29 58c7 4 15-3 21 0s15 4 21 0" stroke="#fff" strokeWidth="1.8" fill="none" opacity=".85" />
      <ellipse cx="50" cy="42" rx="25" ry="7" fill={shade(lid, -0.12)} />
      <ellipse cx="50" cy="40.6" rx="24" ry="6.2" fill={`url(#${foil})`} />
      <ellipse cx="50" cy="40.6" rx="15" ry="3.4" fill={color} opacity=".8" />
      <text x="50" y="42.2" textAnchor="middle" fontSize="4.4" fontWeight="800" fontFamily="system-ui" fill="#fff">FRESH</text>
      <Shine d="M31 47l3.5 33" w={2.4} o={0.55} />
    </Stage>
  );
}

export function BlockPack({ color = ART.yellow, wrap = ART.white, label = 'PANEER', ...b }: Base & { color?: string; wrap?: string; label?: string }) {
  return (
    <Stage {...b}>
      <path d="M22 50l28-12 28 12-28 12z" fill={shade(wrap, -0.02)} />
      <path d="M22 50v22l28 13V62z" fill={shade(wrap, -0.1)} />
      <path d="M78 50v22L50 85V62z" fill={shade(wrap, -0.22)} />
      <path d="M22 57l28 13v8L22 65z" fill={color} />
      <path d="M78 57L50 70v8l28-13z" fill={shade(color, -0.25)} />
      <path d="M33 48l17-7 17 7-17 7z" fill={color} opacity=".9" />
      <text x="50" y="50.4" textAnchor="middle" fontSize="5.2" fontWeight="800" fontFamily="system-ui" fill="#fff" transform="skewX(-8)">{label}</text>
      <Shine d="M27 54l18 8" w={1.6} o={0.7} />
    </Stage>
  );
}

export function EggBox(b: Base) {
  return (
    <Stage {...b}>
      <path d="M18 56h64l-6 26H24z" fill={shade(ART.cream, -0.12)} />
      <path d="M18 56h64v6H18z" fill={shade(ART.cream, -0.2)} />
      {[28, 43, 58].map((x) => <g key={x}><ellipse cx={x + 6} cy="50" rx="6.4" ry="8.4" fill="#F6E7CF" /><ellipse cx={x + 4} cy="47" rx="2" ry="3" fill="#fff" opacity=".7" /></g>)}
      <path d="M24 66h52" stroke={shade(ART.cream, -0.3)} strokeWidth="1" />
      <rect x="38" y="68" width="24" height="9" rx="2" fill={ART.green} />
      <text x="50" y="74.6" textAnchor="middle" fontSize="5" fontWeight="800" fontFamily="system-ui" fill="#fff">6 EGGS</text>
    </Stage>
  );
}

// ------------------------------------------------------------------ bakery

export function Muffin({ top = ART.coffee, cup = ART.red, ...b }: Base & { top?: string; cup?: string }) {
  const [dome, paper] = useIds(2);
  return (
    <Stage {...b} defs={<><radialGradient id={dome} cx=".38" cy=".3" r=".75"><stop offset="0" stopColor={shade(top, 0.35)} /><stop offset=".6" stopColor={top} /><stop offset="1" stopColor={shade(top, -0.35)} /></radialGradient><Cyl id={paper} c={cup} /></>}>
      <path d="M27 54h46l-6 32H33z" fill={`url(#${paper})`} />
      {[33, 39, 45, 51, 57, 63].map((x, i) => <path key={x} d={`M${x} 54l${i < 3 ? 1.2 : -1.2} 32`} stroke={shade(cup, -0.3)} strokeWidth="1.1" opacity=".55" />)}
      <path d="M22 56c-3-16 9-30 28-30s31 14 28 30c-6 3-50 3-56 0z" fill={`url(#${dome})`} />
      {[[38, 40], [50, 34], [60, 42], [45, 48], [57, 50], [31, 50], [67, 51]].map(([x, y]) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx="2.6" ry="2" fill={shade(top, -0.55)} />)}
      <path d="M34 36c4-5 10-7 15-7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".35" />
    </Stage>
  );
}

export function Croissant(b: Base) {
  const [g] = useIds(1);
  const seg = (cx: number, cy: number, rx: number, ry: number, r: number) => (
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${r} ${cx} ${cy})`} fill={`url(#${g})`} stroke={shade(ART.crust, -0.35)} strokeWidth=".8" />
  );
  return (
    <Stage {...b} defs={<radialGradient id={g} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#F6CB7C" /><stop offset=".6" stopColor={ART.crust} /><stop offset="1" stopColor={shade(ART.crust, -0.35)} /></radialGradient>}>
      {seg(22, 66, 9, 6, -40)}{seg(78, 66, 9, 6, 40)}{seg(32, 57, 11, 9, -25)}{seg(68, 57, 11, 9, 25)}{seg(50, 54, 14, 13, 0)}
      <path d="M41 46c6-3 12-3 18 0M39 56c7-3 15-3 22 0" stroke="#FCE1A9" strokeWidth="1.6" fill="none" opacity=".7" strokeLinecap="round" />
    </Stage>
  );
}

export function BreadLoaf(b: Base) {
  const [g] = useIds(1);
  return (
    <Stage {...b} defs={<linearGradient id={g} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D48A3A" /><stop offset=".55" stopColor={ART.crust} /><stop offset="1" stopColor="#8F5320" /></linearGradient>}>
      <rect x="12" y="76" width="76" height="9" rx="3" fill={ART.wood} />
      <rect x="12" y="81" width="76" height="4" rx="2" fill={ART.woodDark} />
      <path d="M16 74c-2-22 12-40 34-40s36 18 34 40z" fill={`url(#${g})`} />
      {[30, 44, 58].map((x) => <path key={x} d={`M${x} 46c4 3 6 8 6 14`} stroke="#F4C681" strokeWidth="2.4" fill="none" strokeLinecap="round" />)}
      <path d="M26 46c5-6 13-9 22-9" stroke="#fff" strokeWidth="2.4" fill="none" opacity=".3" strokeLinecap="round" />
    </Stage>
  );
}

export function CakeSlice(b: Base) {
  return (
    <Stage {...b}>
      <path d="M18 52l52-16 14 8-52 16z" fill="#FBE7EF" />
      <path d="M18 52v28l14 8V60z" fill="#F4C8D6" />
      <path d="M32 60l52-16v28L32 88z" fill="#E9B26A" />
      <path d="M32 69l52-16v5L32 74z" fill="#FBE7EF" />
      <path d="M32 80l52-16v4L32 84z" fill="#7A4A28" opacity=".85" />
      <path d="M18 52l52-16 14 8c-4 3-7-1-10 2s-6 0-9 3-6-1-9 2-6 0-9 3-6-1-9 2-6 0-9 3-7-1-11 2z" fill="#fff" />
      <circle cx="56" cy="38" r="4.4" fill={ART.red} />
      <path d="M56 34c1-4 3-6 6-7" stroke={ART.green} strokeWidth="1.2" fill="none" />
      <circle cx="54.6" cy="36.8" r="1.2" fill="#fff" opacity=".7" />
    </Stage>
  );
}

// ------------------------------------------------------------------ ready to eat

export function Sandwich(b: Base) {
  return (
    <Stage {...b}>
      <path d="M14 82L48 22l38 60z" fill="#DFF0EC" opacity=".55" stroke="#fff" strokeWidth="1.4" />
      <path d="M20 80L48 31l32 49z" fill="#F3D9A4" />
      <path d="M24 74L48 33l28 41z" fill="#FFF3D6" />
      <path d="M26 66c4-3 7 2 11-1s7 2 11-1 7 2 11-1 7 2 11-1l4 6H24z" fill={ART.lettuce} />
      <path d="M24 72h52l-2-3H26z" fill={ART.tomato} />
      <path d="M28 62h44l-2-4H30z" fill={ART.cheese} />
      <path d="M20 80h60l-3-5H23z" fill="#E9C27E" />
      <rect x="54" y="40" width="20" height="11" rx="2" fill={ART.green} transform="rotate(10 64 45)" />
      <text x="64" y="47.6" textAnchor="middle" fontSize="5" fontWeight="800" fontFamily="system-ui" fill="#fff" transform="rotate(10 64 45)">FRESH</text>
      <path d="M44 30L22 70" stroke="#fff" strokeWidth="2" opacity=".7" strokeLinecap="round" />
    </Stage>
  );
}

export function Bowl({ food = ART.rice, ...b }: Base & { food?: string }) {
  const [g] = useIds(1);
  return (
    <Stage {...b} defs={<Cyl id={g} c="#2E3A35" />}>
      <path d="M18 52h64l-7 30c-1 4-11 6-25 6s-24-2-25-6z" fill={`url(#${g})`} />
      <ellipse cx="50" cy="52" rx="32" ry="8.5" fill={shade(food, -0.12)} />
      <ellipse cx="50" cy="50.5" rx="28" ry="6.4" fill={food} />
      {[[38, 49], [46, 52], [56, 48], [62, 52], [44, 47], [53, 51]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill={i % 2 ? ART.green : ART.red} />)}
      <path d="M22 50c2-14 13-22 28-22s26 8 28 22" fill="#fff" opacity=".22" stroke="#fff" strokeWidth="1.4" strokeOpacity=".7" />
      <rect x="40" y="62" width="20" height="10" rx="2" fill={ART.yellow} />
      <path d="M44 67h12" stroke={ART.ink} strokeWidth="1.4" opacity=".6" />
    </Stage>
  );
}

export function NoodleCup({ color = ART.red, ...b }: Base & { color?: string }) {
  const [g] = useIds(1);
  return (
    <Stage {...b} defs={<Cyl id={g} c={ART.paper} />}>
      <path d="M28 26h44l-5 58c-.3 3-8 5-17 5s-16.7-2-17-5z" fill={`url(#${g})`} />
      <path d="M29.4 42h41.2l-1.6 20H31z" fill={color} />
      <path d="M33 50c3-3 5 3 8 0s5 3 8 0 5 3 8 0 5 3 8 0" stroke="#FFE08A" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="26" rx="22" ry="5.4" fill={shade(ART.metal, 0.1)} />
      <path d="M50 26c8-1 16-4 22-12l-3-2c-5 7-12 9-19 10z" fill={color} opacity=".9" />
      <Shine d="M33 31l3 48" w={2.4} o={0.55} />
    </Stage>
  );
}

export function Samosa(b: Base) {
  const [g] = useIds(1);
  const tri = (x: number, r: number) => (
    <g transform={`rotate(${r} ${x} 60)`}>
      <path d={`M${x - 17} 72L${x} 38l17 34z`} fill={`url(#${g})`} stroke={shade(ART.crust, -0.3)} strokeWidth="1" />
      <path d={`M${x - 15} 70h30`} stroke="#F7D18C" strokeWidth="2" strokeDasharray="2 2" />
      <path d={`M${x - 4} 46l-6 14`} stroke="#fff" strokeWidth="1.6" opacity=".4" strokeLinecap="round" />
    </g>
  );
  return (
    <Stage {...b} defs={<radialGradient id={g} cx=".4" cy=".35" r=".8"><stop offset="0" stopColor="#F4C46F" /><stop offset="1" stopColor={shade(ART.crust, -0.15)} /></radialGradient>}>
      <path d="M16 74h68l-6 12H22z" fill="#F7EEDC" stroke={shade(ART.cream, -0.2)} />
      {tri(38, -8)}{tri(62, 8)}
      <circle cx="74" cy="76" r="4" fill={ART.green} />
    </Stage>
  );
}

export function Wrap(b: Base) {
  return (
    <Stage {...b}>
      <g transform="rotate(-28 50 55)">
        <rect x="22" y="40" width="56" height="26" rx="13" fill="#F1D7A5" />
        <rect x="40" y="38" width="38" height="30" rx="4" fill={ART.paper} stroke={shade(ART.cream, -0.25)} />
        <rect x="40" y="48" width="38" height="8" fill={ART.green} />
        <ellipse cx="22" cy="53" rx="5" ry="13" fill="#E3C27F" />
        <ellipse cx="22" cy="53" rx="3.6" ry="10" fill={ART.lettuce} />
        <circle cx="21" cy="49" r="2" fill={ART.tomato} /><circle cx="23" cy="57" r="2" fill={ART.cheese} />
      </g>
    </Stage>
  );
}

// ------------------------------------------------------------------ snacks

export function ChipsBag({ color = ART.yellow, accent = ART.red, small = false, ...b }: Base & { color?: string; accent?: string; small?: boolean }) {
  const [g] = useIds(1);
  const s = small ? 0.82 : 1;
  const zig = (y: number) => `M${30} ${y} ${Array.from({ length: 10 }, (_, i) => `L${30 + (i + 0.5) * 4} ${y + (i % 2 ? 0 : -2.4)}`).join(' ')} L70 ${y}`;
  return (
    <Stage {...b} defs={<Cyl id={g} c={color} />}>
      <g transform={`translate(50 52) scale(${s}) translate(-50 -52)`}>
        <path d="M30 18h40c2 12 4 22 4 34s-2 22-4 34H30c-2-12-4-22-4-34s2-22 4-34z" fill={`url(#${g})`} />
        <path d={zig(18)} stroke={shade(color, -0.3)} strokeWidth="1.2" fill="none" />
        <path d={zig(86)} stroke={shade(color, -0.3)} strokeWidth="1.2" fill="none" />
        <rect x="30" y="20" width="40" height="5" fill={shade(color, -0.18)} opacity=".6" />
        <rect x="30" y="79" width="40" height="5" fill={shade(color, -0.18)} opacity=".6" />
        <path d="M34 34h32l2 10H32z" fill={accent} />
        <text x="50" y="41.6" textAnchor="middle" fontSize="6" fontWeight="900" fontFamily="system-ui" fill="#fff">CRUNCH</text>
        <ellipse cx="50" cy="61" rx="15" ry="11" fill="#FFF7DF" opacity=".95" />
        {[[44, 58, -20], [54, 60, 15], [49, 66, 5]].map(([x, y, r]) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx="6.4" ry="4" transform={`rotate(${r} ${x} ${y})`} fill="#F2B940" stroke="#D99A2B" strokeWidth=".8" />)}
        <Shine d="M33 26c-2 18-2 36 0 52" w={2.4} o={0.5} />
      </g>
    </Stage>
  );
}

export function ChocolateBar({ wrap = ART.purple, ...b }: Base & { wrap?: string }) {
  return (
    <Stage {...b}>
      <g transform="rotate(-18 50 55)">
        <rect x="18" y="40" width="64" height="26" rx="3" fill={wrap} />
        <rect x="18" y="40" width="64" height="5" fill={shade(wrap, 0.25)} />
        <text x="44" y="57.5" textAnchor="middle" fontSize="8" fontWeight="900" fontFamily="system-ui" fill="#fff">COCOA</text>
        <path d="M62 40h20v26H62l4-6-4-7 4-6z" fill="#D9D9D9" />
        <path d="M66 40h16v26H66z" fill="#5A341C" />
        {[44, 52.6].map((y) => [66.5, 74.5].map((x) => <rect key={`${x}${y}`} x={x} y={y} width="6.6" height="7.2" rx="1" fill="#6E4226" stroke="#4A2A15" strokeWidth=".6" />))}
        <path d="M22 43h36" stroke="#fff" strokeWidth="1.4" opacity=".5" />
      </g>
    </Stage>
  );
}

export function BiscuitPack({ wrap = ART.blue, ...b }: Base & { wrap?: string }) {
  const [g] = useIds(1);
  return (
    <Stage {...b} defs={<Vert id={g} top={shade(wrap, 0.1)} bottom={shade(wrap, -0.15)} />}>
      <path d="M16 46l14-12h52l-14 12z" fill={shade(wrap, 0.18)} />
      <path d="M68 46l14-12v34L68 80z" fill={shade(wrap, -0.32)} />
      <rect x="16" y="46" width="52" height="34" fill={`url(#${g})`} />
      <rect x="22" y="52" width="40" height="18" rx="9" fill="#FFF6E3" opacity=".95" />
      {[28, 35, 42, 49, 56].map((x) => <ellipse key={x} cx={x} cy="61" rx="3" ry="8" fill="#C98A3E" stroke="#A86C2A" strokeWidth=".7" />)}
      <text x="42" y="77" textAnchor="middle" fontSize="5.2" fontWeight="900" fontFamily="system-ui" fill="#fff">BISCUITS</text>
    </Stage>
  );
}

export function Jar({ fill = ART.caramel, lid = ART.red, ...b }: Base & { fill?: string; lid?: string }) {
  const [glass, cap] = useIds(2);
  return (
    <Stage {...b} defs={<><Cyl id={glass} c={fill} /><Cyl id={cap} c={lid} /></>}>
      <rect x="28" y="34" width="44" height="54" rx="9" fill={`url(#${glass})`} />
      <rect x="31" y="22" width="38" height="14" rx="3" fill={`url(#${cap})`} />
      {[36, 42, 48, 54, 60].map((x) => <line key={x} x1={x} x2={x} y1="24" y2="34" stroke={shade(lid, -0.3)} strokeWidth="1" opacity=".5" />)}
      <rect x="28" y="48" width="44" height="24" fill={ART.paper} />
      <rect x="28" y="48" width="44" height="4" fill={ART.green} />
      <text x="50" y="64" textAnchor="middle" fontSize="6.4" fontWeight="900" fontFamily="system-ui" fill={ART.brown}>CRUNCHY</text>
      <Shine d="M33 40v42" w={2.6} o={0.45} />
    </Stage>
  );
}

// ------------------------------------------------------------------ pantry, care, household

export function Box({ color = ART.green, accent = ART.yellow, label = 'OATS', ...b }: Base & { color?: string; accent?: string; label?: string }) {
  return (
    <Stage {...b}>
      <path d="M26 26l12-8h36l-12 8z" fill={shade(color, 0.25)} />
      <path d="M62 26l12-8v60l-12 10z" fill={shade(color, -0.32)} />
      <rect x="26" y="26" width="36" height="62" fill={color} />
      <rect x="26" y="34" width="36" height="12" fill={accent} />
      <text x="44" y="42.6" textAnchor="middle" fontSize="7" fontWeight="900" fontFamily="system-ui" fill={shade(color, -0.4)}>{label}</text>
      <circle cx="44" cy="64" r="11" fill="#fff" opacity=".92" />
      <path d="M44 56v15M44 60l-4-3M44 64l4-3M44 68l-4-3" stroke={ART.caramel} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M29 30v54" stroke="#fff" strokeWidth="1.6" opacity=".35" />
    </Stage>
  );
}

export function Tube({ color = ART.teal, ...b }: Base & { color?: string }) {
  return (
    <Stage {...b}>
      <g transform="rotate(-24 50 55)">
        <path d="M30 34h40l-4 44H34z" fill="#fff" stroke={shade(ART.cream, -0.2)} />
        <path d="M30 34h40v6H30z" fill={shade(ART.metal, -0.1)} />
        {[32, 36, 40, 44, 48, 52, 56, 60, 64].map((x) => <line key={x} x1={x} x2={x} y1="34" y2="40" stroke="#fff" opacity=".6" />)}
        <path d="M31.6 50h36.8l-1.6 16H33.2z" fill={color} />
        <path d="M33 58c8-5 14 4 34-2" stroke="#fff" strokeWidth="2" fill="none" />
        <rect x="42" y="78" width="16" height="10" rx="2" fill={color} />
      </g>
    </Stage>
  );
}

export function PumpBottle({ liquid = ART.teal, ...b }: Base & { liquid?: string }) {
  const [g] = useIds(1);
  return (
    <Stage {...b} defs={<Cyl id={g} c={shade(liquid, 0.4)} />}>
      <rect x="32" y="36" width="36" height="52" rx="8" fill={`url(#${g})`} />
      <rect x="44" y="26" width="12" height="11" fill={shade(ART.metal, -0.1)} />
      <path d="M41 26h18v-5H44v-5h20v4" stroke={shade(ART.metal, -0.25)} strokeWidth="4" fill="none" strokeLinejoin="round" />
      <rect x="32" y="52" width="36" height="22" fill="#fff" opacity=".92" />
      <circle cx="50" cy="63" r="6" fill={liquid} />
      <path d="M47 63.5l2 2 4-4.5" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <Shine d="M36 42v40" w={2.6} o={0.5} />
    </Stage>
  );
}

export function TissueBox({ color = ART.teal, ...b }: Base & { color?: string }) {
  return (
    <Stage {...b}>
      <path d="M20 50l14-10h48l-14 10z" fill={shade(color, 0.3)} />
      <path d="M68 50l14-10v32L68 84z" fill={shade(color, -0.3)} />
      <rect x="20" y="50" width="48" height="34" fill={color} />
      {[28, 40, 52, 64].map((x) => <circle key={x} cx={x - 2} cy="70" r="3" fill="#fff" opacity=".35" />)}
      <path d="M40 45c2-9 12-16 22-10-6 1-8 5-8 10z" fill="#fff" stroke={shade(ART.cream, -0.2)} />
      <path d="M44 45c4-6 10-6 14-4" stroke={shade(ART.cream, -0.25)} fill="none" />
    </Stage>
  );
}

export function SoapBar({ color = ART.mint, ...b }: Base & { color?: string }) {
  return (
    <Stage {...b}>
      <rect x="20" y="50" width="60" height="30" rx="15" fill={shade(color, -0.2)} />
      <rect x="20" y="44" width="60" height="30" rx="15" fill={color} />
      <rect x="32" y="52" width="36" height="14" rx="7" fill="none" stroke="#fff" strokeWidth="1.6" opacity=".8" />
      <text x="50" y="62" textAnchor="middle" fontSize="7" fontWeight="900" fontFamily="system-ui" fill={ART.greenDark}>PURE</text>
      {[[28, 36, 3], [36, 28, 4.6], [68, 34, 3.4]].map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill="none" stroke={ART.sky} strokeWidth="1.2" />)}
    </Stage>
  );
}

export function BlisterPack({ color = ART.yellow, ...b }: Base & { color?: string }) {
  return (
    <Stage {...b}>
      <rect x="26" y="12" width="48" height="76" rx="5" fill={ART.greenDark} />
      <rect x="44" y="16" width="12" height="5" rx="2.5" fill={ART.cream} />
      <rect x="32" y="28" width="36" height="46" rx="6" fill="#fff" opacity=".28" stroke="#fff" strokeOpacity=".6" />
      {[38, 52].map((x) => <g key={x}><rect x={x} y="32" width="10" height="38" rx="3" fill={color} /><rect x={x} y="32" width="10" height="9" rx="2" fill={ART.ink} /><rect x={x + 2} y="44" width="2" height="22" fill="#fff" opacity=".5" /></g>)}
      <text x="50" y="83" textAnchor="middle" fontSize="6" fontWeight="900" fontFamily="system-ui" fill={ART.yellow}>POWER</text>
    </Stage>
  );
}

export function CupStack(b: Base) {
  return (
    <Stage {...b}>
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M32 ${30 + i * 7}h36l-5 ${48 - i * 7}H37z`} fill={i === 3 ? '#fff' : shade(ART.paper, -0.04 * i)} stroke={shade(ART.cream, -0.25)} />)}
      <rect x="30" y="28" width="40" height="5" rx="2.5" fill={shade(ART.cream, -0.1)} />
      <path d="M38 58h24" stroke={ART.green} strokeWidth="4" />
    </Stage>
  );
}
