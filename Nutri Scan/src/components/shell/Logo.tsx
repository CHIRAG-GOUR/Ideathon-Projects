import React from 'react';
import Link from 'next/link';
import { APP_NAME } from '@/lib/app';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <linearGradient id="ns-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ABEFE2" />
          <stop offset="1" stopColor="#C8E8FF" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#ns-logo-bg)" />
      <path d="M11 15v-3a2 2 0 0 1 2-2h3M24 10h3a2 2 0 0 1 2 2v3M29 25v3a2 2 0 0 1-2 2h-3M16 30h-3a2 2 0 0 1-2-2v-3" stroke="#137B6F" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <circle cx="20" cy="21" r="5.5" fill="#FF8C7F" />
      <path d="M20 15.5c.5-2 2-3 3.8-3.2-.2 1.9-1.6 3.2-3.8 3.2z" fill="#26B9A5" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label={`${APP_NAME} home`}>
      <LogoMark className="h-9 w-9" />
      <span className="whitespace-nowrap text-lg font-extrabold tracking-tight text-ink">
        Nutri <span className="text-aqua-600">Scan</span>
      </span>
    </Link>
  );
}
