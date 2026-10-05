import React from 'react';
import { EMOJI_3D } from '@/lib/emoji3d-list';
import { cn } from '@/lib/utils';

function codepoints(emoji: string) {
  return Array.from(emoji)
    .map((c) => c.codePointAt(0)!)
    .filter((c) => c !== 0xfe0f)
    .map((c) => c.toString(16).padStart(4, '0'))
    .join('-');
}

/**
 * Renders an emoji as a Fluent Emoji 3D image (same look on every device),
 * falling back to the system emoji when we don't ship that image.
 */
export function Emoji3D({ emoji, size = 48, fill, className, label, eager }: { emoji: string; size?: number; fill?: string; className?: string; label?: string; eager?: boolean }) {
  const cp = codepoints(emoji);
  if (!EMOJI_3D.has(cp)) {
    return (
      <span role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} className={cn('inline-block leading-none', className)} style={{ fontSize: fill ? undefined : size * 0.82 }}>
        {emoji}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/e3d/${cp}.webp`}
      width={size}
      height={size}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={cn('inline-block select-none object-contain', className)}
      style={fill ? { width: fill, height: fill } : { width: size, height: size }}
    />
  );
}
