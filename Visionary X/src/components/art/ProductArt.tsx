import React from 'react';
import type { ProductArtId } from '@/lib/products';

/**
 * Hand-built product illustrations — one consistent flat, warm style.
 * All share a 120×120 viewBox sitting on a baseline at y≈108 with a soft shadow,
 * so they line up on shelves, cards, the barcode sheet and canvases.
 */

type SvgProps = React.SVGProps<SVGSVGElement> & { title?: string };

function Frame({ children, title, ...rest }: SvgProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 120 120" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} {...rest}>
      {title ? <title>{title}</title> : null}
      <ellipse cx="60" cy="111" rx="34" ry="4.5" fill="#6B4B2B" opacity="0.14" />
      {children}
    </svg>
  );
}

export function MilkArt(props: SvgProps) {
  return (
    <Frame {...props}>
      <rect x="47" y="10" width="26" height="12" rx="3.5" fill="#3F8FC7" />
      <rect x="47" y="13.5" width="26" height="2" fill="#63ABDC" />
      <path d="M50 22h20v8c7 3.5 10 8 10 15v58c0 4.4-3.6 8-8 8H48c-4.4 0-8-3.6-8-8V45c0-7 3-11.5 10-15z" fill="#F7FBFE" stroke="#C4E0F4" strokeWidth="2" />
      <path d="M40 58h40v34H40z" fill="#3F8FC7" />
      <path d="M40 58h40v5H40z" fill="#63ABDC" />
      <path d="M60 67c0 0-7.5 8.3-7.5 12.6a7.5 7.5 0 0 0 15 0C67.5 75.3 60 67 60 67z" fill="#FFFFFF" />
      <rect x="45" y="36" width="4.5" height="18" rx="2.25" fill="#FFFFFF" />
      <rect x="45" y="96" width="4.5" height="8" rx="2.25" fill="#FFFFFF" />
    </Frame>
  );
}

export function BreadArt(props: SvgProps) {
  return (
    <Frame {...props}>
      <path d="M16 74c0-17 10-26 24-26 5-9 14-12 22-9 7-6 19-6 26 1 12 2 18 11 18 22v12H16z" fill="#E0A45E" />
      <path d="M40 48c5-9 14-12 22-9 7-6 19-6 26 1 12 2 18 11 18 22v2c-4-8-12-12-20-12-6-6-17-7-25-2-8-4-17-3-21 0z" fill="#C9833E" opacity="0.55" />
      <path d="M45 56c3-3 7-4 10-3M64 51c3-3 8-4 11-2M83 55c3-2 7-2 10 0" stroke="#A9662C" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M13 72h94l-3 32c-.4 4-3.8 7-7.8 7H23.8c-4 0-7.4-3-7.8-7z" fill="#F8EEDB" />
      <path d="M13 72h94l-.6 7H13.6z" fill="#EFE1C6" />
      <rect x="15" y="84" width="90" height="10" fill="#2F8F55" />
      <path d="M60 99c4-3 9-3 12 0-3 3-8 3-12 0z" fill="#5DB277" />
    </Frame>
  );
}

export function BiscuitsArt(props: SvgProps) {
  return (
    <Frame {...props}>
      <circle cx="74" cy="22" r="13" fill="#D39A55" />
      <circle cx="70" cy="19" r="1.6" fill="#A96A2C" />
      <circle cx="78" cy="24" r="1.6" fill="#A96A2C" />
      <rect x="26" y="24" width="68" height="84" rx="9" fill="#F5B633" />
      <path d="M26 30l5-6 5 6 5-6 5 6 5-6 5 6 5-6 5 6 5-6 5 6 5-6 5 6 4-6v10H26z" fill="#E09A1F" />
      <rect x="26" y="40" width="68" height="11" fill="#E4572E" />
      <circle cx="47" cy="75" r="14" fill="#D39A55" stroke="#B87A38" strokeWidth="2.5" />
      <circle cx="73" cy="75" r="14" fill="#D39A55" stroke="#B87A38" strokeWidth="2.5" />
      {[
        [43, 71], [51, 72], [46, 79], [69, 71], [77, 73], [72, 80],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.8" fill="#A96A2C" />
      ))}
      <rect x="32" y="96" width="56" height="5" rx="2.5" fill="#FBE1A2" />
    </Frame>
  );
}

export function JuiceArt(props: SvgProps) {
  return (
    <Frame {...props}>
      <path d="M71 6l4 1.5-5 20" stroke="#E4572E" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M34 30l19-14 20 14z" fill="#FBE1A2" />
      <path d="M73 30l-20-14 12-4 18 12z" fill="#F8CB63" />
      <path d="M73 30l10-6v78l-10 7z" fill="#E9A92F" />
      <rect x="34" y="30" width="39" height="79" rx="2" fill="#F8CB63" />
      <rect x="34" y="30" width="39" height="14" fill="#2F8F55" />
      <circle cx="53.5" cy="76" r="14" fill="#FFF8EC" />
      <circle cx="53.5" cy="76" r="11" fill="#F2A516" />
      {[0, 45, 90, 135].map((a) => (
        <rect key={a} x="52.8" y="65" width="1.4" height="22" fill="#FFF8EC" transform={`rotate(${a} 53.5 76)`} />
      ))}
      <path d="M58 56c4-6 11-7 14-5-3 5-9 7-14 5z" fill="#5DB277" />
    </Frame>
  );
}

export function PaneerArt(props: SvgProps) {
  return (
    <Frame {...props}>
      <path d="M30 56l12-12h52l-12 12z" fill="#FFFDF5" stroke="#EFE1C6" strokeWidth="1.5" />
      <path d="M82 56l12-12v30l-12 12z" fill="#E8D7B2" />
      <rect x="30" y="56" width="52" height="30" fill="#F6EBD2" />
      <path d="M47 56v30M64 56v30M30 71h52" stroke="#E2CFA9" strokeWidth="1.5" />
      <path d="M18 82h86l-8 24c-.8 2.4-3 4-5.5 4H31.5c-2.5 0-4.7-1.6-5.5-4z" fill="#E1F2E4" stroke="#96CFA3" strokeWidth="2" />
      <path d="M18 82h86" stroke="#5DB277" strokeWidth="3" strokeLinecap="round" />
      <rect x="44" y="90" width="34" height="12" rx="4" fill="#2F8F55" />
      <path d="M56 96c3-3 7-3 10 0-3 3-7 3-10 0z" fill="#E1F2E4" />
      <path d="M36 50l9-5" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
    </Frame>
  );
}

export function RiceArt(props: SvgProps) {
  return (
    <Frame {...props}>
      <path d="M40 28c6-10 34-10 40 0l-4 6H44z" fill="#E6D0B0" />
      <path d="M43 30c5 3 29 3 34 0" stroke="#C4985F" strokeWidth="2" fill="none" />
      <rect x="54" y="20" width="12" height="7" rx="3" fill="#E4572E" />
      <path d="M44 33h32c10 3 16 11 17 21l4 44c.6 6.5-4.5 12-11 12H34c-6.5 0-11.6-5.5-11-12l4-44c1-10 7-18 17-21z" fill="#F2E7D6" stroke="#E2CFA9" strokeWidth="2" />
      <path d="M25.6 62h68.8l1.3 22H24.3z" fill="#2F8F55" />
      {[
        [40, 70], [50, 76], [60, 69], [70, 76], [80, 71], [45, 79], [66, 80],
      ].map(([cx, cy], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx="3.2" ry="1.7" fill="#FFFDF5" transform={`rotate(${i * 27} ${cx} ${cy})`} />
      ))}
      <path d="M48 44c3 4 3 10 0 14" stroke="#E2CFA9" strokeWidth="2" strokeLinecap="round" fill="none" />
      <ellipse cx="96" cy="108" rx="2.6" ry="1.4" fill="#FFFDF5" stroke="#E2CFA9" />
      <ellipse cx="103" cy="106" rx="2.6" ry="1.4" fill="#FFFDF5" stroke="#E2CFA9" />
    </Frame>
  );
}

export function BoxArt({ tape = true, label = true, ...props }: SvgProps & { tape?: boolean; label?: boolean }) {
  return (
    <Frame {...props}>
      <path d="M18 42l14-14h72l-14 14z" fill="#E6C697" />
      <path d="M90 42l14-14v64l-14 14z" fill="#C4985F" />
      <rect x="18" y="42" width="72" height="64" fill="#D6B587" />
      {tape && <path d="M47 42l14-14h10L57 42z" fill="#F2E7D6" opacity="0.9" />}
      {tape && <rect x="47" y="42" width="10" height="20" fill="#F2E7D6" opacity="0.9" />}
      {label && (
        <g>
          <rect x="26" y="74" width="34" height="24" rx="3" fill="#FFFDF8" />
          {[29, 32, 34, 37, 40, 42, 45, 48, 50, 53].map((x, i) => (
            <rect key={x} x={x} y="79" width={i % 3 === 0 ? 2 : 1.2} height="11" fill="#26312A" />
          ))}
          <rect x="29" y="92" width="26" height="2" rx="1" fill="#C4985F" />
        </g>
      )}
    </Frame>
  );
}

export const PRODUCT_ART: Record<ProductArtId, (props: SvgProps) => React.ReactElement> = {
  milk: MilkArt,
  bread: BreadArt,
  biscuits: BiscuitsArt,
  juice: JuiceArt,
  paneer: PaneerArt,
  rice: RiceArt,
};

export function ProductArt({ id, ...props }: SvgProps & { id: ProductArtId }) {
  const Art = PRODUCT_ART[id];
  return <Art {...props} />;
}
