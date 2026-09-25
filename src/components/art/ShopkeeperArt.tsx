import React from 'react';

/**
 * Our shopkeeper, drawn in the same flat warm style as the products.
 * `worried` — hand on forehead, holding a paper stock note.
 * `happy`   — relaxed smile, holding a barcode scanner.
 */

const SKIN = '#B9784F';
const SKIN_SHADE = '#9C6240';
const HAIR = '#2E2520';
const KURTA = '#F6EAD3';
const KURTA_LINE = '#E2CFA9';
const APRON = '#2F8F55';
const APRON_DARK = '#237645';

type Mood = 'worried' | 'happy';

function Arm({ points }: { points: string }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={points} stroke={KURTA_LINE} strokeWidth="21" />
      <polyline points={points} stroke={KURTA} strokeWidth="17" />
    </g>
  );
}

export function ShopkeeperArt({ mood, ...props }: React.SVGProps<SVGSVGElement> & { mood: Mood }) {
  const happy = mood === 'happy';
  return (
    <svg viewBox="0 0 220 320" overflow="visible" aria-hidden {...props}>
      <ellipse cx="110" cy="312" rx="62" ry="7" fill="#6B4B2B" opacity="0.14" />

      {/* legs */}
      <rect x="86" y="220" width="21" height="84" rx="9" fill="#6B5444" />
      <rect x="113" y="220" width="21" height="84" rx="9" fill="#6B5444" />
      <rect x="78" y="296" width="32" height="13" rx="6.5" fill="#5A3F2C" />
      <rect x="110" y="296" width="32" height="13" rx="6.5" fill="#5A3F2C" />

      {/* back arm (behind torso) */}
      {happy ? <Arm points="74,134 62,184 70,214" /> : <Arm points="148,134 162,182 158,212" />}
      {happy ? (
        <circle cx="70" cy="218" r="9.5" fill={SKIN} />
      ) : (
        <g>
          <circle cx="158" cy="216" r="9.5" fill={SKIN} />
          <g transform="rotate(12 166 230)">
            <rect x="152" y="216" width="30" height="36" rx="3" fill="#FFFDF8" stroke="#E2CFA9" strokeWidth="1.5" />
            <path d="M157 225h20M157 231h16M157 237h19M157 243h12" stroke="#C4985F" strokeWidth="2" strokeLinecap="round" />
          </g>
          <circle cx="156" cy="219" r="6" fill={SKIN} />
        </g>
      )}

      {/* kurta */}
      <path d="M68 140c2-20 20-28 38-28h8c18 0 36 8 38 28l6 98c-30 10-66 10-94 0z" fill={KURTA} stroke={KURTA_LINE} strokeWidth="2" />
      {/* apron */}
      <path d="M88 122h44l4 30 8 86c-22 8-48 8-68 0l8-86z" fill={APRON} />
      <path d="M88 122l9-10M132 122l-9-10" stroke={APRON_DARK} strokeWidth="4" strokeLinecap="round" />
      <path d="M81 158h58" stroke={APRON_DARK} strokeWidth="3" />
      <rect x="96" y="176" width="28" height="22" rx="4" fill={APRON_DARK} />
      <rect x="116" y="168" width="4" height="14" rx="2" fill="#F5B633" />
      <path d="M104 132c3-3 7-3 12 0-5 4-9 4-12 0z" fill="#96CFA3" />

      {/* neck + head */}
      <rect x="101" y="96" width="18" height="20" rx="6" fill={SKIN_SHADE} />
      <ellipse cx="83" cy="80" rx="5.5" ry="8" fill={SKIN_SHADE} />
      <ellipse cx="137" cy="80" rx="5.5" ry="8" fill={SKIN_SHADE} />
      <ellipse cx="110" cy="76" rx="27" ry="31" fill={SKIN} />
      {/* beard */}
      <path d="M84 82c2 20 12 30 26 30s24-10 26-30c-3 11-11 18-26 18s-23-7-26-18z" fill={HAIR} opacity="0.9" />
      {/* hair */}
      <path d="M83 72c-2-20 9-31 27-31s29 11 27 31c-4-10-12-15-22-16-12-1-24 3-32 16z" fill={HAIR} />
      <path d="M84 66c1-4 3-7 5-9" stroke="#6E625A" strokeWidth="2" strokeLinecap="round" />
      {/* brows */}
      {happy ? (
        <path d="M94 66q5-4 10-1M116 65q5-3 10 1" stroke={HAIR} strokeWidth="3" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M94 67l10-4M116 63l10 4" stroke={HAIR} strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
      {/* eyes */}
      {happy ? (
        <path d="M96 76q4-4 8 0M116 76q4-4 8 0" stroke={HAIR} strokeWidth="2.8" strokeLinecap="round" fill="none" />
      ) : (
        <g fill={HAIR}>
          <circle cx="100" cy="75" r="2.7" />
          <circle cx="120" cy="75" r="2.7" />
        </g>
      )}
      <path d="M110 78q-4 8 1 10" stroke={SKIN_SHADE} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {happy && (
        <g fill="#E0876A" opacity="0.35">
          <circle cx="94" cy="86" r="5" />
          <circle cx="126" cy="86" r="5" />
        </g>
      )}
      {/* moustache + mouth */}
      <path d="M97 93q7-5 13-1 6-4 13 1-6 4-13 2-7 2-13-2z" fill={HAIR} />
      {happy ? (
        <path d="M101 98q9 9 18 0z" fill="#FFFFFF" stroke="#7A3E2A" strokeWidth="2" strokeLinejoin="round" />
      ) : (
        <path d="M103 102q7-5 14 0" stroke="#7A3E2A" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      )}

      {/* front arm */}
      {happy ? (
        <g>
          <Arm points="148,134 166,176 186,166" />
          {/* handheld scanner */}
          <rect x="183" y="150" width="11" height="26" rx="5" fill={APRON_DARK} transform="rotate(14 188 163)" />
          <rect x="172" y="136" width="40" height="18" rx="7" fill="#FFFDF8" stroke="#96CFA3" strokeWidth="2" />
          <rect x="202" y="140" width="8" height="10" rx="2" fill="#5DB277" />
          <circle cx="188" cy="166" r="10" fill={SKIN} />
        </g>
      ) : (
        <g>
          <Arm points="74,134 56,100 86,60" />
          <path d="M80 50c7-5 19-5 23 1 2 3 0 8-4 9l-16 2c-5 0-8-7-3-12z" fill={SKIN} />
          <path d="M142 50q-5 8 0 11 5-3 0-11z" fill="#95C8EA" />
          <path d="M150 64q-3 5 0 7 3-2 0-7z" fill="#95C8EA" />
        </g>
      )}
    </svg>
  );
}
