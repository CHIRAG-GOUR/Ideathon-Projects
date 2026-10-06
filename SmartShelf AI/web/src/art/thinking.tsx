// Mini illustrations for "How SmartShelf thinks": input → analyse → predict → act. Isometric-leaning, same palette
// as the store scene so the explanation reads as part of the store, not a marketing section.
import { ART, shade } from './palette';

const Frame = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <svg viewBox="0 0 120 96" className="h-auto w-full" role="img" aria-label={label}>
    <ellipse cx="60" cy="86" rx="44" ry="6" fill="#000" opacity="0.18" />
    {children}
  </svg>
);

/** 01 Input: a delivery carton (stock), a receipt (sales) and a dated tag (expiry). */
export function InputArt() {
  return (
    <Frame label="Stock, sales and expiry data">
      <path d="M14 52l26-13 26 13-26 13z" fill="#D6AA6B" />
      <path d="M14 52v24l26 13V65z" fill="#C8995B" />
      <path d="M66 52v24L40 89V65z" fill="#B3854A" />
      <path d="M27 45.5l26 13" stroke="#8C6435" strokeWidth="3" />
      <rect x="66" y="16" width="30" height="50" rx="3" fill={ART.paper} transform="rotate(8 81 41)" />
      {[24, 31, 38, 45].map((y, i) => <rect key={y} x="71" y={y} width={i === 3 ? 12 : 20} height="3" rx="1.5" fill={i === 3 ? ART.green : '#CBBFA7'} transform="rotate(8 81 41)" />)}
      <path d="M68 62l4-3 4 3 4-3 4 3 4-3 4 3 4-3" stroke={ART.paper} strokeWidth="3" fill="none" transform="rotate(8 81 41)" />
      <path d="M84 60l20 0 6 8-6 8H84z" fill={ART.yellow} />
      <circle cx="89" cy="68" r="2.4" fill={ART.ink} />
      <rect x="94" y="65.5" width="10" height="2" rx="1" fill={ART.ink} opacity=".6" />
      <rect x="94" y="69.5" width="7" height="2" rx="1" fill={ART.ink} opacity=".6" />
    </Frame>
  );
}

/** 02 Analyse: daily sales bars on a shelf board, read through a lens. */
export function AnalyseArt() {
  const bars = [18, 24, 20, 30, 27, 36, 40];
  return (
    <Frame label="Demand analysed from sales">
      <rect x="12" y="20" width="80" height="58" rx="8" fill={shade(ART.greenDark, 0.15)} />
      <rect x="12" y="70" width="80" height="8" rx="3" fill="#C89B63" />
      {bars.map((h, i) => <rect key={i} x={20 + i * 10} y={68 - h} width="7" height={h} rx="2" fill={i >= 5 ? ART.yellow : ART.mint} opacity={i >= 5 ? 1 : 0.85} />)}
      <path d="M20 46 L90 30" stroke={ART.white} strokeWidth="1.6" strokeDasharray="3 3" opacity=".7" />
      <circle cx="88" cy="40" r="15" fill="#CFF3FF" fillOpacity=".35" stroke={ART.ink} strokeWidth="4" />
      <path d="M99 51l11 11" stroke={ART.ink} strokeWidth="6" strokeLinecap="round" />
    </Frame>
  );
}

/** 03 Predict: projected stock falling through the safety line, with the stock-out point marked. */
export function PredictArt() {
  return (
    <Frame label="Stock-out, expiry and slow stock predicted">
      <rect x="10" y="16" width="100" height="62" rx="8" fill={ART.paper} />
      <rect x="10" y="52" width="100" height="12" fill={ART.yellow} opacity=".25" />
      <path d="M10 52h100" stroke={ART.yellow} strokeWidth="2" strokeDasharray="4 3" />
      <path d="M18 28 C40 32 52 40 66 52 S86 70 98 74" stroke={ART.green} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M18 28 C40 32 52 40 66 52 S86 70 98 74 L98 78 L18 78Z" fill={ART.green} opacity=".12" />
      <circle cx="66" cy="52" r="5" fill={ART.red} />
      <circle cx="66" cy="52" r="10" fill="none" stroke={ART.red} strokeWidth="2" opacity=".5" />
      <rect x="70" y="22" width="34" height="14" rx="7" fill={ART.red} />
      <rect x="75" y="27.5" width="24" height="3" rx="1.5" fill={ART.white} />
    </Frame>
  );
}

/** 04 Act: three shelf tags — Restock, Sell soon, Hold. */
export function ActArt() {
  const tag = (x: number, y: number, c: string, r: number) => (
    <g transform={`rotate(${r} ${x + 22} ${y + 10})`}>
      <path d={`M${x} ${y}h36l8 10-8 10H${x}z`} fill={c} />
      <circle cx={x + 34} cy={y + 10} r="2.6" fill={ART.paper} />
      <rect x={x + 6} y={y + 8} width="20" height="4" rx="2" fill={c === ART.yellow ? ART.ink : ART.white} opacity=".85" />
    </g>
  );
  return (
    <Frame label="Restock, sell soon or hold">
      <path d="M20 22h80" stroke="#C89B63" strokeWidth="5" strokeLinecap="round" />
      {[34, 60, 86].map((x) => <path key={x} d={`M${x} 22v8`} stroke={ART.ink} strokeWidth="1.5" opacity=".5" />)}
      {tag(14, 32, ART.red, -6)}
      {tag(40, 46, ART.yellow, 3)}
      {tag(66, 58, '#8D8577', -3)}
    </Frame>
  );
}
