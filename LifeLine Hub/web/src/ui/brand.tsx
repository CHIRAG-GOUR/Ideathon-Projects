'use client';
/**
 * LifeLine Hub brand: a hospital-green tile, a heartbeat that runs into a location pin with an ambulance-red
 * heart of its own — from incident to care. Plus the beacon glyph used on the sidebar's SOS button.
 */
import { motion } from 'framer-motion';
import { useId } from 'react';
import { cx } from './kit';

export const MARK_SVG = (tile = true, id = 'llg') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><linearGradient id="${id}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#27A36C"/><stop offset="1" stop-color="#075A39"/></linearGradient></defs>
${tile ? `<rect width="64" height="64" rx="18" fill="url(#${id})"/>` : ''}
<path d="M9 36h9l4-9.5 6 19 6-15 3.5 5.5H42" fill="none" stroke="${tile ? '#FFFFFF' : '#0B8A57'}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M48 12.5a9.5 9.5 0 0 1 9.5 9.5c0 7-9.5 16-9.5 16s-9.5-9-9.5-16a9.5 9.5 0 0 1 9.5-9.5z" fill="${tile ? '#FFFFFF' : '#0B8A57'}"/>
<path d="M48 18.6c1.2-1.6 4.4-1.3 4.4 1.4 0 2.2-2.7 4.1-4.4 5.3-1.7-1.2-4.4-3.1-4.4-5.3 0-2.7 3.2-3 4.4-1.4z" fill="#DA1E2C"/>
</svg>`;

export function Mark({ size = 36, tile = true, className }: { size?: number; tile?: boolean; className?: string }) {
  // each instance needs its own gradient id: a shared one breaks when the first copy sits in a hidden sidebar
  const id = 'llg' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return <span className={cx('inline-block shrink-0', className)} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: MARK_SVG(tile, id).replace('<svg ', `<svg width="${size}" height="${size}" `) }} aria-hidden />;
}

export function Logo({ size = 34, light, word = true, className }: { size?: number; light?: boolean; word?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)} aria-label="LifeLine Hub">
      <Mark size={size} />
      {word && (
        <span className="leading-none">
          <span className={cx('block font-display text-[17px] font-semibold tracking-[-0.02em]', light ? 'text-white' : 'text-ink')}>
            LifeLine<span className="text-teal-600"> Hub</span>
          </span>
          <span className="mt-0.5 block font-mono text-[8.5px] font-semibold uppercase tracking-[0.22em] text-coral-600">Emergency care</span>
        </span>
      )}
    </span>
  );
}

/** A tiny ambulance beacon: housing, red dome, and light rays — the SOS glyph. */
export function BeaconGlyph({ size = 22, lit = true, className }: { size?: number; lit?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden>
      {lit && <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".9"><path d="M4 12l3 1.5M28 12l-3 1.5M16 3v3.5M7.5 5.5l2 2.6M24.5 5.5l-2 2.6" /></g>}
      <path d="M8 22a8 8 0 0 1 16 0z" fill="currentColor" />
      <path d="M11.5 17.5a5 5 0 0 1 4.5-3" fill="none" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="5" y="22" width="22" height="5" rx="1.6" fill="currentColor" opacity=".85" />
    </svg>
  );
}

/** The sidebar's SOS: an ambulance-red plate with the beacon and a chevron livery edge. */
export function SosRailButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onClick} aria-label="Open SOS"
      className="relative flex h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-coral-500 font-display text-[16px] font-semibold tracking-wide text-white shadow-coral">
      <span className="livery absolute inset-x-0 bottom-0 h-1.5 opacity-60" aria-hidden />
      <motion.span animate={{ opacity: [1, 0.55, 1] }} transition={{ duration: 1.4, repeat: Infinity }} className="text-white"><BeaconGlyph size={24} /></motion.span>
      SOS
    </motion.button>
  );
}
