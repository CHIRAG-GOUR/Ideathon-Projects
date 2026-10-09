'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ScanLine, Refrigerator, BarChart3, ChefHat } from 'lucide-react';
import { Logo } from './Logo';
import { SyncBadge } from './SyncBadge';
import { SoundToggle } from './SoundToggle';
import { cn } from '@/lib/utils';

const DESKTOP = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/scan', label: 'Scan', icon: ScanLine },
  { href: '/food', label: 'My Food', icon: Refrigerator },
  { href: '/insights', label: 'Insights', icon: BarChart3 },
  { href: '/kitchen', label: 'Simulation', icon: ChefHat },
];
const MOBILE = DESKTOP.slice(0, 4);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullscreen = pathname === '/scan';

  return (
    <>
      {!fullscreen && (
        <header className="sticky top-0 z-40 border-b border-cloud-300/70 bg-cloud-100/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
          <div className="page flex h-16 items-center justify-between gap-3">
            <Logo />
            <nav className="hidden items-center gap-1 rounded-full bg-cloud-200/70 p-1 lg:flex" aria-label="Main">
              {DESKTOP.map((l) => {
                const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn('flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition', active ? 'bg-white text-aqua-700 shadow-soft' : 'text-ink-soft hover:text-ink')}
                  >
                    <l.icon className="h-4 w-4" />
                    {l.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center gap-2">
              <SyncBadge />
              <SoundToggle />
              <Link href="/scan" className="btn btn-primary hidden min-h-[40px] px-4 text-sm lg:inline-flex">
                <ScanLine className="h-4 w-4" /> Scan
              </Link>
            </div>
          </div>
        </header>
      )}

      <main className={cn(!fullscreen && 'pb-28 lg:pb-12')}>{children}</main>

      {!fullscreen && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-cloud-300 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
          aria-label="Main (mobile)"
        >
          <div className="grid grid-cols-4">
            {MOBILE.map((l) => {
              const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
              const scan = l.href === '/scan';
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn('flex flex-col items-center gap-1 pb-2 pt-2 text-[11px] font-bold', active ? 'text-aqua-700' : 'text-ink-muted')}
                >
                  <span
                    className={cn(
                      'flex h-8 w-12 items-center justify-center rounded-full transition-colors',
                      scan ? 'bg-gradient-to-br from-aqua-300 to-[#9CD8FF] text-aqua-900 shadow-[0_8px_18px_-8px_rgba(38,185,165,0.9)]' : active && 'bg-aqua-50'
                    )}
                  >
                    <l.icon className="h-5 w-5" />
                  </span>
                  {l.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
