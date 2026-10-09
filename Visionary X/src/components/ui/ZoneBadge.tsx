import React from 'react';
import { ZONES, ZoneId } from '@/lib/products';
import { cn } from '@/lib/utils';
import { Leaf, Clock3, Flame } from 'lucide-react';

const ICONS: Record<ZoneId, React.ComponentType<{ className?: string }>> = {
  FRESH: Leaf,
  SELL_SOON: Clock3,
  SELL_FIRST: Flame,
};

export function ZoneBadge({
  zone,
  size = 'md',
  className,
  pulse,
}: {
  zone: ZoneId;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  pulse?: boolean;
}) {
  const z = ZONES[zone];
  const Icon = ICONS[zone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-extrabold uppercase tracking-[0.08em]',
        size === 'sm' && 'px-2.5 py-1 text-[10px]',
        size === 'md' && 'px-3 py-1.5 text-xs',
        size === 'lg' && 'px-4 py-2 text-sm',
        pulse && zone === 'SELL_FIRST' && 'animate-soft-pulse',
        className
      )}
      style={{ background: z.soft, color: z.ink }}
    >
      <Icon className={cn(size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
      {z.label}
    </span>
  );
}

export function ZoneDot({ zone, className }: { zone: ZoneId; className?: string }) {
  return <span className={cn('inline-block h-2.5 w-2.5 rounded-full', className)} style={{ background: ZONES[zone].color }} />;
}

export const ZONE_ICONS = ICONS;
