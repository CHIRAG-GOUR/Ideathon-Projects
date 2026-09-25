import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="12" fill="#2F8F55" />
      <path d="M9 13h22" stroke="#FFF8EC" strokeWidth="2.4" strokeLinecap="round" />
      {[11, 14, 16.5, 19.5, 22, 25, 28].map((x, i) => (
        <rect key={x} x={x} y="17" width={i % 2 ? 1.4 : 2.2} height="10" rx="0.6" fill="#FFF8EC" />
      ))}
      <path d="M27 31c-1-6 3-10 9-10 0 6-3 10-9 10z" fill="#F5B633" />
    </svg>
  );
}

export function Logo({ href = '/', className, compact }: { href?: string; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn('group flex items-center gap-2.5', className)} aria-label="Smart Stock home">
      <LogoMark className="h-9 w-9 transition-transform duration-300 group-hover:-rotate-6" />
      {!compact && (
        <span className="whitespace-nowrap font-display text-[1.35rem] font-semibold leading-none tracking-tight text-ink">
          Smart<span className="text-leaf-600"> Stock</span>
        </span>
      )}
    </Link>
  );
}
