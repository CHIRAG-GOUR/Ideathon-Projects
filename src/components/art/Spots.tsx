import React from 'react';

/** Small spot illustrations (same flat warm style) used in explanatory sections. */

type P = React.SVGProps<SVGSVGElement>;

const Ground = () => <ellipse cx="60" cy="108" rx="40" ry="5" fill="#6B4B2B" opacity="0.12" />;

export function SpotScan(props: P) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden {...props}>
      <Ground />
      <rect x="18" y="58" width="56" height="42" rx="6" fill="#FFFDF8" stroke="#E2CFA9" strokeWidth="2" />
      {[24, 28, 31, 35, 38, 43, 46, 50, 54, 57, 61, 65].map((x, i) => (
        <rect key={x} x={x} y="66" width={i % 3 ? 1.6 : 2.6} height="22" fill="#26312A" />
      ))}
      <rect x="24" y="92" width="44" height="3" rx="1.5" fill="#C4985F" />
      <path d="M86 44 44 70l-4-8 42-26z" fill="#5DB277" opacity="0.35" />
      <rect x="70" y="16" width="34" height="60" rx="8" fill="#2F8F55" transform="rotate(18 87 46)" />
      <rect x="74" y="22" width="26" height="40" rx="4" fill="#E1F2E4" transform="rotate(18 87 46)" />
      <rect x="44" y="76" width="36" height="3" rx="1.5" fill="#E4572E" />
    </svg>
  );
}

export function SpotIdentify(props: P) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden {...props}>
      <Ground />
      <rect x="20" y="22" width="80" height="80" rx="12" fill="#FFFFFF" stroke="#EFE1C6" strokeWidth="2" />
      <rect x="30" y="32" width="28" height="28" rx="8" fill="#E2F0FA" />
      <path d="M40 38h8v4c3 1.5 4 3.5 4 6v8a2 2 0 0 1-2 2H38a2 2 0 0 1-2-2v-8c0-2.5 1-4.5 4-6z" fill="#3F8FC7" />
      <rect x="64" y="36" width="28" height="6" rx="3" fill="#26312A" />
      <rect x="64" y="48" width="20" height="5" rx="2.5" fill="#A3AAA3" />
      <rect x="30" y="70" width="60" height="5" rx="2.5" fill="#EFE1C6" />
      <rect x="30" y="82" width="42" height="5" rx="2.5" fill="#EFE1C6" />
      <circle cx="92" cy="88" r="12" fill="#2F8F55" />
      <path d="M86 88l4 4 8-8" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SpotCalendar(props: P) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden {...props}>
      <Ground />
      <rect x="20" y="26" width="72" height="72" rx="12" fill="#FFFFFF" stroke="#EFE1C6" strokeWidth="2" />
      <rect x="20" y="26" width="72" height="20" rx="10" fill="#E4572E" />
      <rect x="20" y="36" width="72" height="10" fill="#E4572E" />
      <rect x="34" y="18" width="6" height="16" rx="3" fill="#8F2A12" />
      <rect x="72" y="18" width="6" height="16" rx="3" fill="#8F2A12" />
      <text x="56" y="84" textAnchor="middle" fontSize="30" fontWeight="800" fill="#26312A" fontFamily="var(--font-display)">
        2
      </text>
      <circle cx="90" cy="84" r="17" fill="#FDF1D3" stroke="#F2A516" strokeWidth="3" />
      <path d="M90 74v10l7 5" stroke="#9C5F06" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function SpotPriority(props: P) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden {...props}>
      <Ground />
      <rect x="22" y="26" width="76" height="20" rx="10" fill="#E4572E" />
      <rect x="22" y="52" width="76" height="20" rx="10" fill="#F2A516" />
      <rect x="22" y="78" width="76" height="20" rx="10" fill="#2F8F55" />
      <circle cx="34" cy="36" r="5" fill="#fff" />
      <circle cx="34" cy="62" r="5" fill="#fff" />
      <circle cx="34" cy="88" r="5" fill="#fff" />
      <rect x="44" y="33" width="36" height="6" rx="3" fill="#fff" opacity="0.8" />
      <rect x="44" y="59" width="28" height="6" rx="3" fill="#fff" opacity="0.8" />
      <rect x="44" y="85" width="22" height="6" rx="3" fill="#fff" opacity="0.8" />
      <path d="M106 90V32m0 0-7 8m7-8 7 8" stroke="#26312A" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SpotShelf(props: P) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden {...props}>
      <Ground />
      <rect x="14" y="18" width="92" height="88" rx="6" fill="#F8EEDB" />
      <rect x="10" y="16" width="6" height="92" rx="2" fill="#C4985F" />
      <rect x="104" y="16" width="6" height="92" rx="2" fill="#C4985F" />
      {[
        [44, '#E4572E'],
        [74, '#F2A516'],
        [104, '#2F8F55'],
      ].map(([y, c]) => (
        <g key={y as number}>
          <rect x="10" y={y as number} width="100" height="6" rx="2" fill="#D6B587" />
          <rect x="10" y={(y as number) + 4} width="100" height="3" fill={c as string} />
        </g>
      ))}
      <rect x="22" y="26" width="12" height="18" rx="3" fill="#95C8EA" />
      <rect x="38" y="30" width="16" height="14" rx="3" fill="#FFFDF5" stroke="#E2CFA9" />
      <rect x="22" y="58" width="22" height="16" rx="6" fill="#E0A45E" />
      <rect x="22" y="86" width="14" height="18" rx="2" fill="#F8CB63" />
      <rect x="40" y="88" width="16" height="16" rx="3" fill="#F5B633" />
      <rect x="60" y="84" width="18" height="20" rx="6" fill="#F2E7D6" stroke="#E2CFA9" />
      <rect x="70" y="28" width="26" height="16" rx="2" fill="#D6B587" />
      <rect x="70" y="58" width="26" height="16" rx="2" fill="#D6B587" />
    </svg>
  );
}

export function SpotBasket(props: P) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden {...props}>
      <Ground />
      <path d="M36 50c0-14 10-24 24-24s24 10 24 24" stroke="#A97C47" strokeWidth="5" fill="none" strokeLinecap="round" />
      <rect x="44" y="30" width="14" height="26" rx="4" fill="#3F8FC7" />
      <rect x="46" y="38" width="10" height="8" fill="#FFFFFF" />
      <path d="M60 50c0-8 6-14 16-14s12 8 12 14z" fill="#E0A45E" />
      <path d="M16 52h88l-9 46a8 8 0 0 1-8 6H33a8 8 0 0 1-8-6z" fill="#2F8F55" />
      <path d="M16 52h88v8H16z" fill="#237645" />
      {[36, 52, 68, 84].map((x) => (
        <rect key={x} x={x} y="66" width="5" height="28" rx="2.5" fill="#5DB277" />
      ))}
      <circle cx="96" cy="34" r="13" fill="#F5B633" />
      <text x="96" y="39" textAnchor="middle" fontSize="13" fontWeight="900" fill="#26312A" fontFamily="var(--font-sans)">
        ₹
      </text>
    </svg>
  );
}

export function SpotStore(props: P) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden {...props}>
      <Ground />
      <rect x="18" y="40" width="84" height="64" rx="4" fill="#FFF4E0" stroke="#E2CFA9" strokeWidth="2" />
      {Array.from({ length: 6 }).map((_, i) => (
        <g key={i}>
          <rect x={14 + i * 16} y="26" width="16" height="16" fill={i % 2 ? '#FFF8EC' : '#2F8F55'} />
          <path d={`M${14 + i * 16} 42a8 8 0 0 0 16 0z`} fill={i % 2 ? '#FFF8EC' : '#2F8F55'} />
        </g>
      ))}
      <rect x="28" y="60" width="30" height="44" rx="3" fill="#C4E0F4" />
      <rect x="66" y="60" width="26" height="22" rx="3" fill="#FDF1D3" />
      <rect x="70" y="68" width="6" height="10" rx="2" fill="#3F8FC7" />
      <rect x="79" y="70" width="8" height="8" rx="2" fill="#E0A45E" />
    </svg>
  );
}

export function SpotWarehouse(props: P) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden {...props}>
      <Ground />
      <path d="M12 50 60 22l48 28v54H12z" fill="#F2E7D6" stroke="#E2CFA9" strokeWidth="2" />
      <rect x="30" y="60" width="60" height="44" fill="#FFF4E0" />
      <rect x="36" y="80" width="20" height="20" rx="2" fill="#D6B587" />
      <rect x="58" y="80" width="20" height="20" rx="2" fill="#D6B587" />
      <rect x="47" y="62" width="20" height="18" rx="2" fill="#C4985F" />
      <rect x="44" y="40" width="32" height="8" rx="4" fill="#2F8F55" />
    </svg>
  );
}

export function SpotSchool(props: P) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden {...props}>
      <Ground />
      <rect x="16" y="30" width="88" height="56" rx="6" fill="#2F8F55" />
      <rect x="22" y="36" width="76" height="44" rx="4" fill="#E1F2E4" />
      {[30, 34, 37, 41, 44, 49, 52, 56].map((x, i) => (
        <rect key={x} x={x} y="46" width={i % 3 ? 1.6 : 2.6} height="20" fill="#26312A" />
      ))}
      <path d="M66 56h10m-4-5 5 5-5 5" stroke="#26312A" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="80" y="46" width="12" height="20" rx="3" fill="#3F8FC7" />
      <rect x="40" y="86" width="40" height="6" rx="3" fill="#C4985F" />
      <path d="M50 92l-8 14M70 92l8 14" stroke="#C4985F" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
