'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ScanLine, Boxes, Warehouse, Star, Printer } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { DemoModeButton } from './DemoMode';
import { useShop } from '@/lib/store';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { cn } from '@/lib/utils';

const APP_LINKS = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Scan', href: '/scanner', icon: ScanLine },
  { label: 'My Stock', href: '/stock', icon: Boxes },
  { label: 'Warehouse', href: '/warehouse', icon: Warehouse },
];

function PointsPill() {
  const points = useShop((s) => s.points);
  return (
    <span className="chip bg-mango-100 py-1.5 text-mango-700 ring-1 ring-inset ring-mango-200" title="Points earned">
      <Star className="h-4 w-4 fill-mango-400 text-mango-500" />
      <AnimatedNumber value={points} /> pts
    </span>
  );
}

/** In-app navigation: slim top bar + (on phones) a bottom tab bar. */
export function AppNav() {
  const pathname = usePathname();
  return (
    <>
      <header className="no-print sticky top-0 z-50 border-b border-cream-300 bg-background/90 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <Logo />
          <nav className="hidden items-center gap-1 rounded-full bg-cream-200/70 p-1 lg:flex" aria-label="App">
            {APP_LINKS.map((l) => {
              const active = pathname === l.href;
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all',
                    active ? 'bg-white text-leaf-700 shadow-soft' : 'text-ink-soft hover:text-ink'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <PointsPill />
            <Link href="/demo" className="btn btn-ghost hidden h-10 w-10 p-0 sm:inline-flex" title="Print demo barcodes" aria-label="Print demo barcodes">
              <Printer className="h-[18px] w-[18px]" />
            </Link>
            <DemoModeButton className="hidden sm:inline-flex" />
          </div>
        </div>
      </header>

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-50 border-t border-cream-300 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="App (mobile)"
      >
        <div className="grid grid-cols-4">
          {APP_LINKS.map((l) => {
            const active = pathname === l.href;
            const Icon = l.icon;
            const isScan = l.href === '/scanner';
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold', active ? 'text-leaf-700' : 'text-ink-muted')}
              >
                <span
                  className={cn(
                    'flex h-8 w-12 items-center justify-center rounded-full transition-colors',
                    active && 'bg-leaf-100',
                    isScan && !active && 'bg-leaf-600 text-white'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
