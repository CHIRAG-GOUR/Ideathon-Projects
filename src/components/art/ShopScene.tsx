'use client';

import React from 'react';
import { motion, MotionValue, useMotionValue, useTransform } from 'framer-motion';
import { BoxArt, ProductArt } from './ProductArt';
import { ShopkeeperArt } from './ShopkeeperArt';
import type { ProductArtId } from '@/lib/products';

/**
 * One grocery shop, two states. `progress` 0 = stock chaos, 1 = smart shelves.
 * Every product and box has a messy and a tidy position; scrolling interpolates between them.
 */

type Pose = [x: number, y: number, r: number];

const S = 64; // item size
const PLANK = { top: 160, mid: 250, bottom: 340 };
const onPlank = (x: number, plankY: number): Pose => [x, plankY - S * 0.93, 0];

const PRODUCTS: { id: ProductArtId; chaos: Pose; tidy: Pose }[] = [
  { id: 'milk', chaos: [322, 222, 22], tidy: onPlank(58, PLANK.top) },
  { id: 'paneer', chaos: [258, 196, -6], tidy: onPlank(126, PLANK.top) },
  { id: 'bread', chaos: [306, 98, -12], tidy: onPlank(58, PLANK.mid) },
  { id: 'juice', chaos: [96, 170, 75], tidy: onPlank(58, PLANK.bottom) },
  { id: 'biscuits', chaos: [124, 96, 12], tidy: onPlank(126, PLANK.bottom) },
  { id: 'rice', chaos: [372, 292, -8], tidy: onPlank(194, PLANK.bottom) },
];

const BOXES: { chaos: Pose; tidy: Pose }[] = [
  { chaos: [8, 300, -8], tidy: onPlank(236, PLANK.top) },
  { chaos: [66, 312, 6], tidy: onPlank(306, PLANK.top) },
  { chaos: [38, 248, -14], tidy: onPlank(166, PLANK.mid) },
  { chaos: [150, 305, 12], tidy: onPlank(236, PLANK.mid) },
  { chaos: [214, 314, -6], tidy: onPlank(306, PLANK.mid) },
  { chaos: [182, 254, 18], tidy: onPlank(266, PLANK.bottom) },
  { chaos: [292, 300, -10], tidy: onPlank(330, PLANK.bottom) },
];

function Mover({ progress, from, to, children }: { progress: MotionValue<number>; from: Pose; to: Pose; children: React.ReactNode }) {
  const x = useTransform(progress, [0, 1], [from[0], to[0]]);
  const y = useTransform(progress, [0, 1], [from[1], to[1]]);
  const rotate = useTransform(progress, [0, 1], [from[2], to[2]]);
  return <motion.g style={{ x, y, rotate, transformBox: 'fill-box', transformOrigin: 'center' }}>{children}</motion.g>;
}

function Fade({ progress, show, children }: { progress: MotionValue<number>; show: 'chaos' | 'tidy'; children: React.ReactNode }) {
  const opacity = useTransform(progress, show === 'chaos' ? [0, 0.45] : [0.55, 1], show === 'chaos' ? [1, 0] : [0, 1]);
  return <motion.g style={{ opacity }}>{children}</motion.g>;
}

function StickyNote({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect width="28" height="28" rx="2" fill="#F8CB63" />
      <path d="M5 9h17M5 15h12M5 21h15" stroke="#9C5F06" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
    </g>
  );
}

function Chip({ x, y, color, text, sub }: { x: number; y: number; color: string; text: string; sub?: string }) {
  const w = sub ? 130 : 96;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={sub ? 40 : 26} rx="13" fill="#FFFFFF" stroke="#EFE1C6" />
      <circle cx="14" cy="13" r="5" fill={color} />
      <text x="25" y="17.5" fontSize="11" fontWeight="800" fill="#26312A" fontFamily="var(--font-sans)">
        {text}
      </text>
      {sub && (
        <text x="25" y="31" fontSize="9.5" fontWeight="600" fill="#77817A" fontFamily="var(--font-sans)">
          {sub}
        </text>
      )}
    </g>
  );
}

export function ShopScene({ progress, state = 'chaos', className }: { progress?: MotionValue<number>; state?: 'chaos' | 'tidy'; className?: string }) {
  const fallback = useMotionValue(state === 'tidy' ? 1 : 0);
  const p = progress ?? fallback;
  const worried = useTransform(p, [0.4, 0.6], [1, 0]);
  const happy = useTransform(p, [0.4, 0.6], [0, 1]);

  return (
    <svg viewBox="0 0 640 440" className={className} role="img" aria-label={state === 'chaos' ? 'A cluttered grocery shop with boxes everywhere' : 'An organised grocery shop'}>
      <rect width="640" height="440" fill="#FFF4E0" />
      <rect y="350" width="640" height="90" fill="#EBDBBD" />
      <rect y="350" width="640" height="3" fill="#E2CFA9" />
      {/* awning */}
      <g>
        {Array.from({ length: 16 }).map((_, i) => (
          <g key={i}>
            <rect x={i * 40} y="0" width="40" height="40" fill={i % 2 ? '#FFF8EC' : '#2F8F55'} />
            <circle cx={i * 40 + 20} cy="40" r="20" fill={i % 2 ? '#FFF8EC' : '#2F8F55'} />
          </g>
        ))}
        <rect y="0" width="640" height="6" fill="#237645" />
      </g>
      {/* shelving unit */}
      <rect x="40" y="80" width="370" height="270" rx="6" fill="#F8EEDB" />
      <rect x="34" y="78" width="12" height="272" rx="3" fill="#C4985F" />
      <rect x="404" y="78" width="12" height="272" rx="3" fill="#C4985F" />
      {[PLANK.top, PLANK.mid, PLANK.bottom].map((y) => (
        <g key={y}>
          <rect x="34" y={y} width="382" height="10" rx="3" fill="#D6B587" />
          <rect x="34" y={y + 8} width="382" height="4" fill="#C4985F" />
        </g>
      ))}
      {/* zone strips appear when organised */}
      <Fade progress={p} show="tidy">
        {[
          [PLANK.top, '#E4572E', 'SELL FIRST'],
          [PLANK.mid, '#F2A516', 'SELL SOON'],
          [PLANK.bottom, '#2F8F55', 'FRESH'],
        ].map(([y, c, t]) => (
          <g key={t as string}>
            <rect x="34" y={(y as number) + 7} width="382" height="5" fill={c as string} />
            <g transform={`translate(346 ${(y as number) + 12})`}>
              <rect width="62" height="17" rx="4" fill={c as string} />
              <text x="31" y="12" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#FFF" fontFamily="var(--font-sans)">
                {t as string}
              </text>
            </g>
          </g>
        ))}
      </Fade>

      {PRODUCTS.map((it) => (
        <Mover key={it.id} progress={p} from={it.chaos} to={it.tidy}>
          <ProductArt id={it.id} width={S} height={S} />
        </Mover>
      ))}
      {BOXES.map((b, i) => (
        <Mover key={i} progress={p} from={b.chaos} to={b.tidy}>
          <BoxArt width={S + 6} height={S + 6} label={i % 2 === 0} />
        </Mover>
      ))}

      {/* chaos details: extra stock piled everywhere */}
      <Fade progress={p} show="chaos">
        {([
          [-6, 196, 4],
          [0, 142, -7],
          [96, 262, -18],
          [238, 262, 8],
          [262, 206, -4],
          [352, 250, 12],
        ] as Pose[]).map(([x, y, r], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${r} ${S / 2} ${S / 2})`}>
            <BoxArt width={S + 6} height={S + 6} label={i % 3 === 0} />
          </g>
        ))}
        <StickyNote x={70} y={128} r={-8} />
        <StickyNote x={236} y={226} r={10} />
        <StickyNote x={360} y={318} r={-4} />
        <StickyNote x={370} y={120} r={6} />
        <g transform="translate(346 214)">
          <circle r="11" fill="#E4572E" />
          <text y="4.5" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff" fontFamily="var(--font-sans)">
            !
          </text>
        </g>
        <g transform="translate(286 200)">
          <circle r="9" fill="#E4572E" />
          <text y="4" textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff" fontFamily="var(--font-sans)">
            ?
          </text>
        </g>
        <g transform="translate(572 118)">
          <path d="M0 0h44a12 12 0 0 1 12 12v18a12 12 0 0 1-12 12H18l-10 10v-10H0a12 12 0 0 1-12-12V12A12 12 0 0 1 0 0z" fill="#FFFFFF" stroke="#EFE1C6" />
          <text x="16" y="29" textAnchor="middle" fontSize="22" fontWeight="900" fill="#E4572E" fontFamily="var(--font-sans)">
            ?
          </text>
          <text x="36" y="29" textAnchor="middle" fontSize="22" fontWeight="900" fill="#F2A516" fontFamily="var(--font-sans)">
            ?
          </text>
        </g>
      </Fade>

      {/* shopkeeper */}
      <motion.g style={{ opacity: worried }}>
        <ShopkeeperArt mood="worried" x={440} y={172} width={180} height={262} />
      </motion.g>
      <motion.g style={{ opacity: happy }}>
        <ShopkeeperArt mood="happy" x={440} y={172} width={180} height={262} />
      </motion.g>

      {/* smart inventory UI */}
      <Fade progress={p} show="tidy">
        <Chip x={430} y={66} color="#E4572E" text="Milk · Sell first" sub="Expires in 2 days" />
        <Chip x={488} y={116} color="#2F8F55" text="Rice · Fresh" sub="180 days · 50 units" />
        <g transform="translate(596 64)">
          <circle r="14" fill="#2F8F55" />
          <path d="M-6 0l4 4 8-8" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </Fade>
    </svg>
  );
}
