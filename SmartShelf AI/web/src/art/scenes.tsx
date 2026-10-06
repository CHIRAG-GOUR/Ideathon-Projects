// Retail scenes: static, scalable SVG illustrations that set the store atmosphere. Not interactive environments.
import { useId, type ReactNode } from 'react';
import type { Category } from '../engine/types';
import { ART, shade } from './palette';
import * as P from './products';

function useIds(n: number) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return Array.from({ length: n }, (_, i) => `${id}-${i}`);
}

// --- tiny shelf goods (used inside scenes; ~10px tall) ---
const Bot = ({ x, y, c, h = 22 }: { x: number; y: number; c: string; h?: number }) => (
  <g>
    <rect x={x + 3} y={y - h - 4} width="5" height="5" rx="1" fill={shade(c, -0.3)} />
    <path d={`M${x} ${y - h + 6}c0-4 3-5 3-7h5c0 2 3 3 3 7v${h - 7}a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2z`} fill={c} />
    <rect x={x} y={y - h / 2 - 1} width="11" height={h / 3} fill="#fff" opacity=".85" />
    <rect x={x + 1.4} y={y - h + 6} width="1.6" height={h - 8} fill="#fff" opacity=".45" />
  </g>
);
const CanS = ({ x, y, c }: { x: number; y: number; c: string }) => (
  <g>
    <rect x={x} y={y - 16} width="10" height="16" rx="1.6" fill={c} />
    <rect x={x} y={y - 16} width="10" height="2.4" rx="1" fill={ART.metal} />
    <rect x={x} y={y - 9} width="10" height="3" fill="#fff" opacity=".7" />
    <rect x={x + 1.2} y={y - 13} width="1.4" height="11" fill="#fff" opacity=".45" />
  </g>
);
const Bag = ({ x, y, c, a }: { x: number; y: number; c: string; a: string }) => (
  <g>
    <path d={`M${x} ${y}l1.5-24h15l1.5 24z`} fill={c} />
    <path d={`M${x + 1.5} ${y - 24}h15`} stroke={shade(c, -0.3)} strokeWidth="1.4" strokeDasharray="1.5 1.5" />
    <rect x={x + 3} y={y - 18} width="12" height="5" fill={a} />
    <ellipse cx={x + 9} cy={y - 7} rx="5" ry="3.4" fill="#FFF3D6" />
  </g>
);
const BoxS = ({ x, y, c, w = 16, h = 20 }: { x: number; y: number; c: string; w?: number; h?: number }) => (
  <g>
    <rect x={x} y={y - h} width={w} height={h} fill={c} />
    <rect x={x} y={y - h + 4} width={w} height="5" fill="#fff" opacity=".85" />
    <path d={`M${x + w} ${y - h}l3-2v${h}l-3 2z`} fill={shade(c, -0.35)} />
  </g>
);
const Bun = ({ x, y }: { x: number; y: number }) => (
  <g>
    <path d={`M${x} ${y}h16l-2-7H${x + 2}z`} fill={ART.red} />
    <path d={`M${x - 2} ${y - 6}c0-8 4-11 10-11s10 3 10 11z`} fill={ART.coffee} />
    <circle cx={x + 5} cy={y - 11} r="1" fill="#3B2010" /><circle cx={x + 11} cy={y - 10} r="1" fill="#3B2010" />
  </g>
);
const Loaf = ({ x, y }: { x: number; y: number }) => (
  <g>
    <path d={`M${x} ${y}c-1-10 6-15 14-15s15 5 14 15z`} fill={ART.crust} />
    <path d={`M${x + 7} ${y - 11}l3 5M${x + 13} ${y - 13}l3 5M${x + 19} ${y - 11}l3 5`} stroke="#F4C681" strokeWidth="1.6" strokeLinecap="round" />
  </g>
);

/** The hero: a compact convenience-store aisle — beverage cooler, snack shelf, bakery case and dairy chiller. */
export function StoreAisleIllustration({ className, children }: { className?: string; children?: ReactNode }) {
  const [wall, floor, glow, glass, light] = useIds(5);
  const drinks = [ART.red, ART.green, ART.blue, ART.orange, ART.yellow, ART.teal];
  return (
    <div className={`relative ${className ?? ''}`}>
      <svg viewBox="0 0 640 400" className="h-auto w-full" role="img" aria-label="Illustration of a convenience-store aisle: a beverage cooler, snack shelves, a bakery case and a dairy chiller">
        <defs>
          <linearGradient id={wall} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F7EEDC" /><stop offset="1" stopColor="#EADBBE" /></linearGradient>
          <linearGradient id={floor} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D9C8A6" /><stop offset="1" stopColor="#C2AE88" /></linearGradient>
          <radialGradient id={glow} cx=".5" cy=".2" r=".9"><stop offset="0" stopColor="#F2FBFF" /><stop offset="1" stopColor="#BFE3EE" /></radialGradient>
          <linearGradient id={glass} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset=".4" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff" stopOpacity=".18" /></linearGradient>
          <radialGradient id={light} cx=".5" cy="0" r="1"><stop offset="0" stopColor="#FFF6D8" stopOpacity=".9" /><stop offset="1" stopColor="#FFF6D8" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="640" height="400" fill={`url(#${wall})`} />
        {/* ceiling lights */}
        {[120, 320, 520].map((x) => <g key={x}><rect x={x - 46} y="10" width="92" height="7" rx="3.5" fill="#fff" /><ellipse cx={x} cy="18" rx="120" ry="70" fill={`url(#${light})`} /></g>)}
        {/* floor with tiles in perspective */}
        <path d="M0 330h640v70H0z" fill={`url(#${floor})`} />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <path key={i} d={`M${i * 80} 330l${(i - 4) * 26} 70`} stroke="#B9A47C" strokeWidth="1.2" />)}
        <path d="M0 352h640M0 378h640" stroke="#B9A47C" strokeWidth="1.2" />

        {/* aisle signs */}
        {[[40, 'BEVERAGES', ART.green], [218, 'SNACKS', ART.red], [380, 'BAKERY', ART.orange], [514, 'DAIRY', ART.blue]].map(([x, t, c]) => (
          <g key={t as string}>
            <rect x={x as number} y="32" width={t === 'BEVERAGES' ? 138 : 104} height="22" rx="4" fill={c as string} />
            <text x={(x as number) + (t === 'BEVERAGES' ? 69 : 52)} y="47.5" textAnchor="middle" fontSize="11" fontWeight="800" letterSpacing="2" fill="#fff" fontFamily="system-ui">{t as string}</text>
          </g>
        ))}

        {/* beverage cooler */}
        <rect x="24" y="64" width="172" height="270" rx="8" fill={ART.greenDark} />
        <rect x="32" y="74" width="76" height="244" rx="4" fill={`url(#${glow})`} />
        <rect x="112" y="74" width="76" height="244" rx="4" fill={`url(#${glow})`} />
        {[134, 194, 254, 314].map((y, r) => (
          <g key={y}>
            <rect x="32" y={y} width="156" height="4" fill="#9DB7B7" />
            {Array.from({ length: 12 }, (_, i) => (r % 2 ? <CanS key={i} x={36 + i * 12.6} y={y} c={drinks[(i + r) % 6]} /> : <Bot key={i} x={36 + i * 12.6} y={y} c={drinks[(i + r * 2) % 6]} />))}
          </g>
        ))}
        <rect x="32" y="74" width="76" height="244" rx="4" fill={`url(#${glass})`} />
        <rect x="112" y="74" width="76" height="244" rx="4" fill={`url(#${glass})`} />
        <rect x="102" y="150" width="4" height="60" rx="2" fill="#C9D3D0" /><rect x="114" y="150" width="4" height="60" rx="2" fill="#C9D3D0" />
        <rect x="24" y="320" width="172" height="14" rx="3" fill={ART.green} />

        {/* snack gondola */}
        <rect x="212" y="64" width="150" height="270" rx="4" fill="#E2D3B4" />
        <rect x="216" y="70" width="142" height="252" fill="#F2E7D1" />
        {[132, 196, 260, 318].map((y, r) => (
          <g key={y}>
            {Array.from({ length: 7 }, (_, i) => r === 1
              ? <BoxS key={i} x={220 + i * 20} y={y} c={[ART.blue, ART.brown, ART.purple, ART.red][i % 4]} />
              : r === 3 ? <BoxS key={i} x={220 + i * 20} y={y} c={[ART.orange, ART.green, ART.yellow][i % 3]} w={16} h={26} />
              : <Bag key={i} x={219 + i * 20} y={y} c={[ART.yellow, ART.red, ART.orange, ART.green][(i + r) % 4]} a={[ART.red, ART.yellow, ART.green][i % 3]} />)}
            <rect x="214" y={y} width="146" height="8" fill="#C9B48C" />
            <rect x="214" y={y} width="146" height="3" fill="#fff" opacity=".5" />
            {Array.from({ length: 5 }, (_, i) => <rect key={i} x={222 + i * 28} y={y + 2} width="16" height="4.5" rx="1" fill={i % 2 ? ART.yellow : '#fff'} />)}
          </g>
        ))}

        {/* bakery case */}
        <rect x="378" y="150" width="122" height="184" rx="6" fill={ART.woodDark} />
        <rect x="384" y="158" width="110" height="150" rx="4" fill="#FFF4DD" />
        {[206, 258, 304].map((y, r) => (
          <g key={y}>
            <rect x="384" y={y} width="110" height="4" fill="#E8D4AF" />
            {Array.from({ length: 4 }, (_, i) => (r === 1 ? <Loaf key={i} x={390 + i * 26} y={y} /> : <Bun key={i} x={390 + i * 26} y={y} />))}
          </g>
        ))}
        <path d="M384 158l110 0-20 40H384z" fill="#fff" opacity=".28" />
        <rect x="378" y="96" width="122" height="54" rx="6" fill={ART.cream} />
        <rect x="390" y="108" width="98" height="30" rx="4" fill="#fff" />
        <text x="439" y="128" textAnchor="middle" fontSize="13" fontWeight="800" fill={ART.orange} fontFamily="system-ui">FRESH</text>

        {/* dairy chiller */}
        <rect x="514" y="64" width="104" height="270" rx="8" fill="#DCE6EA" />
        <rect x="522" y="74" width="88" height="244" rx="4" fill={`url(#${glow})`} />
        {[140, 206, 272, 316].map((y, r) => (
          <g key={y}>
            <rect x="522" y={y} width="88" height="4" fill="#9DB7B7" />
            {Array.from({ length: 5 }, (_, i) => (r % 2
              ? <g key={i}><rect x={527 + i * 17} y={y - 14} width="13" height="14" rx="2" fill="#fff" /><rect x={527 + i * 17} y={y - 9} width="13" height="5" fill={[ART.blue, ART.green, ART.orange][i % 3]} /></g>
              : <g key={i}><path d={`M${527 + i * 17} ${y}v-20l4-6h7l2 6v20z`} fill="#fff" /><rect x={527 + i * 17} y={y - 12} width="13" height="7" fill={i % 2 ? ART.blue : ART.yellow} /></g>))}
          </g>
        ))}
        <rect x="522" y="74" width="88" height="244" rx="4" fill={`url(#${glass})`} />
        <rect x="514" y="320" width="104" height="14" rx="3" fill={ART.blue} />
        {/* price-strip glow at the floor line */}
        <rect x="0" y="330" width="640" height="3" fill="#fff" opacity=".6" />
      </svg>
      {children}
    </div>
  );
}

/** Marker placed over the aisle (percent coordinates), e.g. "2 RESTOCK". */
export function AisleMarker({ x, y, tone, label, pulse }: { x: number; y: number; tone: 'red' | 'yellow' | 'green' | 'orange'; label: string; pulse?: boolean }) {
  const bg = { red: 'bg-red text-white', yellow: 'bg-yellow text-ink', green: 'bg-green text-white', orange: 'bg-orange text-white' }[tone];
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
      <span className={`relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide shadow-lift sm:text-[11.5px] ${bg}`}>
        <span className="relative flex h-2 w-2">
          {pulse && <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-white" />}
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
        {label}
      </span>
    </div>
  );
}

export function StorefrontMini({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 70" className={className} aria-hidden="true">
      <rect x="8" y="22" width="104" height="44" rx="3" fill="#0F4A35" />
      <path d="M4 22h112l-6-14H10z" fill={ART.cream} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={i} d={`M${10 + i * 16} 8h8l-1 14h-9z`} fill={i % 2 ? ART.green : ART.cream} />)}
      <path d="M4 22c4 5 10 5 14 0 4 5 10 5 14 0 4 5 10 5 14 0 4 5 10 5 14 0 4 5 10 5 14 0 4 5 10 5 14 0 4 5 10 5 14 0 4 5 10 5 14 0" fill={ART.green} />
      <rect x="16" y="34" width="38" height="26" rx="2" fill="#BFE3EE" />
      <rect x="66" y="34" width="22" height="32" rx="2" fill="#BFE3EE" />
      {[20, 28, 36, 44].map((x, i) => <rect key={x} x={x} y="44" width="5" height="12" rx="1" fill={[ART.red, ART.yellow, ART.green, ART.orange][i]} />)}
      <circle cx="84" cy="51" r="1.4" fill={ART.greenDark} />
      <rect x="94" y="34" width="12" height="12" rx="2" fill={ART.yellow} />
      <path d="M97 40l2 2 4-4" stroke={ART.greenDark} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function CoolerIllustration({ size = 96 }: { size?: number }) {
  const [glow] = useIds(1);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs><radialGradient id={glow} cx=".5" cy=".2" r=".9"><stop offset="0" stopColor="#F2FBFF" /><stop offset="1" stopColor="#BFE3EE" /></radialGradient></defs>
      <ellipse cx="50" cy="94" rx="30" ry="4" fill={ART.shadow} opacity=".13" />
      <rect x="24" y="8" width="52" height="86" rx="5" fill={ART.greenDark} />
      <rect x="29" y="14" width="42" height="70" rx="3" fill={`url(#${glow})`} />
      {[34, 54, 74].map((y, r) => <g key={y}><rect x="29" y={y} width="42" height="2" fill="#9DB7B7" />{[0, 1, 2, 3].map((i) => <Bot key={i} x={31 + i * 10} y={y} c={[ART.red, ART.green, ART.blue, ART.orange][(i + r) % 4]} h={17} />)}</g>)}
      <path d="M29 14h42L50 50H29z" fill="#fff" opacity=".3" />
      <rect x="24" y="86" width="52" height="8" rx="2" fill={ART.green} />
    </svg>
  );
}

/** Category tiles: each category gets a small composition of its own products. */
export function CategoryScene({ category, size = 92 }: { category: Category; size?: number }) {
  const s = Math.round(size * 0.7);
  const pair = (a: ReactNode, b: ReactNode) => (
    <div className="relative" style={{ width: size, height: size * 0.8 }} aria-hidden="true">
      <div className="absolute bottom-0 left-0">{a}</div>
      <div className="absolute bottom-0 right-0">{b}</div>
    </div>
  );
  switch (category) {
    case 'Beverages': return <CoolerIllustration size={size * 0.85} />;
    case 'Snacks': return pair(<P.ChipsBag size={s} />, <P.ChocolateBar size={s} />);
    case 'Bakery': return pair(<P.BreadLoaf size={s} />, <P.Muffin size={s} />);
    case 'Ready-to-Eat': return pair(<P.Sandwich size={s} />, <P.Bowl size={s} />);
    case 'Dairy': return pair(<P.Carton size={s} />, <P.Tub size={s} />);
    case 'Packaged Food': return pair(<P.Box size={s} label="RICE" color={ART.greenDark} />, <P.NoodleCup size={s} />);
    case 'Personal Care': return pair(<P.PumpBottle size={s} />, <P.Tube size={s} />);
    case 'Household': return pair(<P.TissueBox size={s} />, <P.CupStack size={s} />);
    default: return pair(<P.BlisterPack size={s} />, <P.Box size={s} label="MISC" color={ART.teal} />);
  }
}

// --- concept illustrations (headers and empty states) ---
export function RestockIllustration({ size = 120 }: { size?: number }) {
  const box = (x: number, y: number, c: string) => (
    <g>
      <path d={`M${x} ${y}l16-8 16 8-16 8z`} fill={shade(c, 0.25)} />
      <path d={`M${x} ${y}v18l16 8V${y + 8}z`} fill={c} />
      <path d={`M${x + 32} ${y}v18l-16 8V${y + 8}z`} fill={shade(c, -0.25)} />
      <path d={`M${x + 8} ${y - 4}l16 8`} stroke="#fff" strokeOpacity=".5" strokeWidth="2" />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="60" cy="108" rx="40" ry="5" fill={ART.shadow} opacity=".12" />
      {box(26, 74, '#C98A3E')}{box(58, 74, '#C98A3E')}{box(42, 50, '#D9A055')}
      <circle cx="92" cy="30" r="18" fill={ART.green} />
      <path d="M92 40V20M84 28l8-8 8 8" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExpiryIllustration({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="60" cy="108" rx="40" ry="5" fill={ART.shadow} opacity=".12" />
      <rect x="18" y="26" width="64" height="70" rx="8" fill="#fff" stroke={shade(ART.cream, -0.2)} strokeWidth="2" />
      <rect x="18" y="26" width="64" height="18" rx="8" fill={ART.orange} />
      <rect x="18" y="36" width="64" height="8" fill={ART.orange} />
      {[32, 68].map((x) => <rect key={x} x={x - 3} y="18" width="6" height="14" rx="3" fill={ART.greenDark} />)}
      <text x="50" y="78" textAnchor="middle" fontSize="28" fontWeight="900" fill={ART.ink} fontFamily="system-ui">1</text>
      <circle cx="86" cy="80" r="20" fill={ART.yellow} stroke="#fff" strokeWidth="4" />
      <path d="M86 68v12l7 5" stroke={ART.ink} strokeWidth="3.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function QuietShelfIllustration({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="60" cy="108" rx="44" ry="5" fill={ART.shadow} opacity=".1" />
      <rect x="10" y="20" width="100" height="84" rx="4" fill="#E9E4D8" />
      {[50, 98].map((y) => <rect key={y} x="10" y={y} width="100" height="6" fill="#CFC6B2" />)}
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={16 + i * 15} y="30" width="12" height="20" rx="2" fill={['#B9C2BB', '#C7CCC4', '#AEB8B1'][i % 3]} />)}
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={16 + i * 15} y="76" width="12" height="22" rx="2" fill={['#C7CCC4', '#AEB8B1', '#B9C2BB'][i % 3]} />)}
      <path d="M80 12c6 0 10 3 10 8" stroke="#9AA59D" strokeWidth="2" fill="none" strokeLinecap="round" />
      <text x="96" y="20" fontSize="12" fontWeight="800" fill="#9AA59D" fontFamily="system-ui">z</text>
    </svg>
  );
}

export function HealthyShelfIllustration({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="60" cy="108" rx="44" ry="5" fill={ART.shadow} opacity=".1" />
      <rect x="12" y="30" width="96" height="74" rx="4" fill="#F2E7D1" />
      {[64, 98].map((y) => <rect key={y} x="12" y={y} width="96" height="6" fill="#C9B48C" />)}
      {[0, 1, 2, 3, 4, 5].map((i) => <Bot key={i} x={18 + i * 15} y={64} c={[ART.red, ART.green, ART.blue, ART.orange, ART.yellow, ART.teal][i]} h={26} />)}
      {[0, 1, 2, 3, 4].map((i) => <BoxS key={i} x={18 + i * 17} y={98} c={[ART.orange, ART.green, ART.purple, ART.blue, ART.red][i]} w={13} h={24} />)}
      <circle cx="96" cy="26" r="16" fill={ART.green} />
      <path d="M89 26l5 5 9-10" stroke="#fff" strokeWidth="3.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ForecastIllustration({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <rect x="10" y="18" width="100" height="78" rx="10" fill="#fff" stroke={shade(ART.cream, -0.2)} strokeWidth="2" />
      <path d="M20 40h80M20 60h80M20 80h80" stroke={ART.cream} strokeWidth="2" />
      <path d="M20 70h80" stroke={ART.yellow} strokeWidth="2.4" strokeDasharray="5 4" />
      <path d="M22 34L44 46 62 58 82 76 98 88" stroke={ART.green} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="82" cy="76" r="6" fill={ART.red} stroke="#fff" strokeWidth="2.4" />
    </svg>
  );
}

export function CheckoutIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 260" className={className} role="img" aria-label="Illustration of a convenience-store checkout counter">
      <ellipse cx="180" cy="246" rx="160" ry="10" fill="#000" opacity=".18" />
      <rect x="20" y="150" width="320" height="92" rx="8" fill="#0F4A35" />
      <rect x="20" y="150" width="320" height="16" rx="6" fill={ART.cream} />
      <rect x="34" y="180" width="292" height="6" fill={ART.green} />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={48 + i * 58} y="198" width="40" height="30" rx="4" fill="#0B3D2B" />)}
      <rect x="226" y="88" width="88" height="62" rx="6" fill="#2B3A33" />
      <rect x="234" y="96" width="72" height="34" rx="3" fill="#BFE3EE" />
      <text x="270" y="118" textAnchor="middle" fontSize="14" fontWeight="800" fill={ART.greenDark} fontFamily="system-ui">₹ 245</text>
      <rect x="250" y="136" width="40" height="8" rx="2" fill={ART.yellow} />
      <g transform="translate(36 70) scale(.9)"><P.Bottle size={90} liquid={ART.sky} accent={ART.blue} cap={ART.blue} /></g>
      <g transform="translate(96 82) scale(.8)"><P.ChipsBag size={90} /></g>
      <g transform="translate(150 92) scale(.72)"><P.ColdCoffee size={90} /></g>
    </svg>
  );
}

/** Inventory banner art: a stocked gondola shelf in three tiers. */
export function InventoryShelfIllustration({ size = 210 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 210 152" aria-hidden="true">
      <rect x="8" y="6" width="194" height="140" rx="8" fill="#F2E7D1" />
      {[52, 98, 140].map((y, r) => (
        <g key={y}>
          {Array.from({ length: 8 }, (_, i) => (r === 0 ? <Bot key={i} x={16 + i * 23} y={y} c={[ART.red, ART.green, ART.blue, ART.orange][(i + r) % 4]} h={34} />
            : r === 1 ? <Bag key={i} x={14 + i * 23} y={y} c={[ART.yellow, ART.red, ART.orange, ART.green][i % 4]} a={[ART.red, ART.yellow, ART.green][i % 3]} />
            : <BoxS key={i} x={15 + i * 23} y={y} c={[ART.purple, ART.blue, ART.brown, ART.teal][i % 4]} w={17} h={30} />))}
          <rect x="8" y={y} width="194" height="7" fill="#C9B48C" />
          {Array.from({ length: 6 }, (_, i) => <rect key={i} x={18 + i * 32} y={y + 1.5} width="18" height="4" rx="1" fill={i % 2 ? ART.yellow : '#fff'} />)}
        </g>
      ))}
    </svg>
  );
}
