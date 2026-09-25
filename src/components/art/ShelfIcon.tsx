import React from 'react';
import { ZONES, ZoneId } from '@/lib/products';

/** Tiny grocery shelf with the zone's colour strip — used next to recommendations. */
export function ShelfIcon({ zone, className }: { zone: ZoneId; className?: string }) {
  const z = ZONES[zone];
  return (
    <svg viewBox="0 0 64 56" className={className} aria-hidden>
      <rect x="4" y="4" width="56" height="48" rx="6" fill="#FFFDF8" stroke="#E2CFA9" strokeWidth="2" />
      <rect x="4" y="24" width="56" height="5" fill="#D6B587" />
      <rect x="4" y="46" width="56" height="6" rx="2" fill="#D6B587" />
      <rect x="4" y="29" width="56" height="3" fill={z.color} />
      <rect x="10" y="10" width="9" height="14" rx="2" fill="#95C8EA" />
      <rect x="22" y="13" width="10" height="11" rx="2" fill="#F5B633" />
      <rect x="35" y="9" width="8" height="15" rx="2" fill="#F2E7D6" stroke="#E2CFA9" />
      <rect x="46" y="14" width="9" height="10" rx="2" fill="#E0A45E" />
      <rect x="10" y="35" width="12" height="11" rx="2" fill="#D6B587" />
      <rect x="25" y="33" width="10" height="13" rx="2" fill="#5DB277" />
      <rect x="38" y="36" width="16" height="10" rx="2" fill="#D6B587" />
    </svg>
  );
}
