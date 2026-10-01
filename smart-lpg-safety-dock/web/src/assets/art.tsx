// Custom SVG system for the Smart LPG Dock (no icon library). 24×24 line icons + larger illustrations.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 22, p: P) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...p });

export const IconCylinder = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><rect x="9" y="2.5" width="6" height="3" rx="1" /><rect x="6.5" y="5.5" width="11" height="15.5" rx="4.5" /><path d="M6.5 12h11" /></svg>
);
export const IconDock = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><rect x="8" y="3" width="8" height="12" rx="3.5" /><path d="M3.5 17.5h17v3h-17zM7 17.5v-2.5h10v2.5" /><circle cx="18.5" cy="19" r=".6" fill="currentColor" /></svg>
);
export const IconGas = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M5 15c-1.5-1.5-1.5-4 .5-5 0-3 3-4.5 5-3 1-2 5-2 6 .5 2.5-.5 4.5 2 3 4.5 1.5 1.5.5 4-1.5 4" /><path d="M8 18.5h8M10 21h4" /></svg>
);
export const IconTemp = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M10 14.5V5a2 2 0 014 0v9.5a4 4 0 11-4 0z" /><path d="M12 10v6" /><path d="M17 6h2.5M17 9h2" /></svg>
);
export const IconTilt = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M3 20h18" /><rect x="9" y="5" width="6" height="12" rx="2.5" transform="rotate(14 12 11)" /><path d="M5 9a9 9 0 013-5" strokeDasharray="1.5 2" /></svg>
);
export const IconUsage = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M4 18a8 8 0 1116 0" /><path d="M12 18l4-6" /><circle cx="12" cy="18" r="1.3" fill="currentColor" /></svg>
);
export const IconShield = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z" /><path d="M8.5 12l2.4 2.4 4.6-4.8" /></svg>
);
export const IconAlert = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 3.5l9.5 16.5h-19z" /><path d="M12 10v4.5M12 17.2v.3" /></svg>
);
export const IconValve = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M3 14h5l2-3h4l2 3h5" /><path d="M12 11V5M8 5h8" /><path d="M3 11v6M21 11v6" /></svg>
);
export const IconContained = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.6 2.6L16 9.5" /></svg>
);
export const IconLink = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M4.5 9.5a10 10 0 0115 0M7 12.5a6.5 6.5 0 0110 0M9.6 15.4a3 3 0 014.8 0" /><circle cx="12" cy="18.5" r="1" fill="currentColor" /></svg>
);
export const IconChef = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M7 11a3.5 3.5 0 01-.5-7 4 4 0 017 -1 3.5 3.5 0 013.5 8v3H7z" /><path d="M7 14h10v6H7z" /></svg>
);
export const IconPlay = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M7 4.5v15l12-7.5z" fill="currentColor" /></svg>
);
export const IconPause = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" /></svg>
);
export const IconRestart = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M4 12a8 8 0 102.3-5.6" /><path d="M4 4v4.5h4.5" /></svg>
);
export const IconCompare = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><rect x="3" y="4" width="7.5" height="16" rx="2" /><rect x="13.5" y="4" width="7.5" height="16" rx="2" /></svg>
);
export const IconDashboard = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><rect x="3" y="3" width="8" height="10" rx="2" /><rect x="13" y="3" width="8" height="6" rx="2" /><rect x="13" y="11" width="8" height="10" rx="2" /><rect x="3" y="15" width="8" height="6" rx="2" /></svg>
);
export const IconSim = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M3 20h18M5 20V10l7-5 7 5v10" /><path d="M10 20v-5h4v5" /></svg>
);
export const IconChart = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M4 19h16" /><path d="M5 15l4-4 3 3 6-7" /></svg>
);
export const IconList = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="5" cy="6" r="1" fill="currentColor" /><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="5" cy="18" r="1" fill="currentColor" /></svg>
);
export const IconPresent = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M12 16v4M8 20h8" /><path d="M10 8l4 2-4 2z" fill="currentColor" /></svg>
);
export const IconGear = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 13a7.6 7.6 0 000-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 00-1.7-1L15 3.5h-4l-.4 2.5a7.4 7.4 0 00-1.7 1l-2.4-1-2 3.4L6.6 11a7.6 7.6 0 000 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 001.7 1l.4 2.5h4l.4-2.5a7.4 7.4 0 001.7-1l2.4 1 2-3.4z" /></svg>
);
export const IconSound = ({ size, muted, ...p }: P & { muted?: boolean }) => (
  <svg {...base(size, p)}><path d="M4 9h4l5-4v14l-5-4H4z" />{muted ? <path d="M17 9l4 6M21 9l-4 6" /> : <path d="M16.5 9a4 4 0 010 6M19 6.5a7.5 7.5 0 010 11" />}</svg>
);
export const IconMenu = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const IconBack = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M15 5l-7 7 7 7" /></svg>
);
export const IconNext = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M9 5l7 7-7 7" /></svg>
);
export const IconCube = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9" /></svg>
);

/** Brand mark: cylinder on the dock with a status dot. */
export function Logo({ size = 36, word = true }: { size?: number; word?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="16" fill="#142F55" />
        <rect x="24" y="9" width="16" height="6" rx="2" fill="#C3CAD3" />
        <rect x="19" y="14" width="26" height="34" rx="10" fill="#2563B0" />
        <rect x="19" y="27" width="26" height="3" fill="#7FA9DD" />
        <rect x="11" y="48" width="42" height="8" rx="3" fill="#EADFCB" />
        <circle cx="32" cy="52" r="2.2" fill="#1E9A58" />
      </svg>
      {word && (
        <span className="leading-tight">
          <span className="block text-[15px] font-extrabold tracking-tight text-graphite">Smart LPG Dock</span>
          <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-lpg-600">Smart. Safe. Secure.</span>
        </span>
      )}
    </span>
  );
}

/** Product illustration: cylinder + dock with live status colour (used on the dashboard hero). */
export function DockIllustration({ status = '#1E9A58', className = '' }: { status?: string; className?: string }) {
  return (
    <svg viewBox="0 0 220 240" className={className} aria-hidden>
      <defs>
        <linearGradient id="cyl" x1="0" x2="1">
          <stop offset="0" stopColor="#183F73" />
          <stop offset=".35" stopColor="#4F86CB" />
          <stop offset=".6" stopColor="#2563B0" />
          <stop offset="1" stopColor="#142F55" />
        </linearGradient>
        <linearGradient id="steel" x1="0" x2="1">
          <stop offset="0" stopColor="#9AA4B1" />
          <stop offset=".5" stopColor="#EEF1F4" />
          <stop offset="1" stopColor="#9AA4B1" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="222" rx="96" ry="12" fill="#1F2733" opacity=".12" />
      <rect x="24" y="196" width="172" height="22" rx="7" fill="url(#steel)" />
      <rect x="38" y="190" width="144" height="10" rx="5" fill="#EADFCB" />
      <ellipse cx="110" cy="192" rx="60" ry="6" fill="none" stroke={status} strokeWidth="4" />
      <rect x="168" y="150" width="18" height="46" rx="4" fill="#1F2733" />
      <circle cx="177" cy="146" r="7" fill="#C3CAD3" />
      <circle cx="177" cy="162" r="3" fill={status} />
      <rect x="60" y="56" width="100" height="134" rx="40" fill="url(#cyl)" />
      <rect x="60" y="112" width="100" height="10" fill="#EADFCB" opacity=".9" />
      <rect x="82" y="32" width="56" height="30" rx="8" fill="#1D4F91" />
      <rect x="100" y="18" width="20" height="18" rx="4" fill="#c9a227" />
      <circle cx="110" cy="16" r="10" fill="#E8730C" />
      <rect x="84" y="10" width="14" height="12" rx="2" fill="#142F55" />
      <text x="110" y="153" textAnchor="middle" fontSize="11" fontWeight="800" fill="#D7E6F6" fontFamily="monospace">LPG-2700</text>
    </svg>
  );
}
