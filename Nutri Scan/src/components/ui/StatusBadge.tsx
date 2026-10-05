import React from 'react';
import type { ExpiryStatus } from '@/types';
import { STATUS_META } from '@/lib/expiry';
import { cn } from '@/lib/utils';

export function StatusBadge({ status, className, size = 'md' }: { status: ExpiryStatus; className?: string; size?: 'sm' | 'md' }) {
  const m = STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-extrabold uppercase tracking-[0.06em]',
        size === 'sm' ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-[11px]',
        status === 'use_first' && 'animate-soft-pulse',
        className
      )}
      style={{ background: m.soft, color: m.ink }}
      data-status={status}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}
