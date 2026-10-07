'use client';
/** LifeLine Hub mark: a heartbeat line that resolves into a location pulse — from incident to care. */
import { cx } from './kit';

export const MARK_SVG = (tile = true) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#22B8B0"/><stop offset="1" stop-color="#22D3EE"/></linearGradient>
<radialGradient id="r" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#22D3EE" stop-opacity=".55"/><stop offset="1" stop-color="#22D3EE" stop-opacity="0"/></radialGradient></defs>
${tile ? '<rect width="64" height="64" rx="18" fill="#081325"/>' : ''}
<circle cx="47" cy="25" r="13" fill="url(#r)"/>
<path d="M9 36h10l4-10 6 20 6-15 3.5 5H44" fill="none" stroke="url(#g)" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="47" cy="25" r="5" fill="#22D3EE"/><circle cx="47" cy="25" r="2" fill="#081325"/>
<path d="M47 30v6" stroke="#22D3EE" stroke-width="3" stroke-linecap="round"/>
</svg>`;

export function Mark({ size = 36, tile = true, className }: { size?: number; tile?: boolean; className?: string }) {
  return <span className={cx('inline-block shrink-0', className)} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: MARK_SVG(tile).replace('<svg ', `<svg width="${size}" height="${size}" `) }} aria-hidden />;
}

export function Logo({ size = 34, light, word = true, className }: { size?: number; light?: boolean; word?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)} aria-label="LifeLine Hub">
      <Mark size={size} />
      {word && (
        <span className={cx('font-display text-[17px] font-semibold leading-none tracking-[-0.02em]', light ? 'text-white' : 'text-ink')}>
          LifeLine<span className={light ? 'text-cyan-300' : 'text-teal-500'}> Hub</span>
        </span>
      )}
    </span>
  );
}
