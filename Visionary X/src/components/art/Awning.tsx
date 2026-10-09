import React from 'react';

/** Striped shop awning with a scalloped edge. */
export function Awning({ className, stripes = 12 }: { className?: string; stripes?: number }) {
  const w = 40;
  return (
    <svg viewBox={`0 0 ${stripes * w} 58`} preserveAspectRatio="none" className={className} aria-hidden>
      {Array.from({ length: stripes }).map((_, i) => (
        <g key={i}>
          <rect x={i * w} y="0" width={w} height="36" fill={i % 2 ? '#FFF8EC' : '#2F8F55'} />
          <path d={`M${i * w} 36 a20 20 0 0 0 ${w} 0z`} fill={i % 2 ? '#FFF8EC' : '#2F8F55'} />
        </g>
      ))}
      <rect width={stripes * w} height="7" fill="#237645" />
    </svg>
  );
}
