'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Camera, Car, ListChecks, Map, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/live', label: 'Live Drive', icon: Car },
  { href: '/report', label: 'Report', icon: Camera },
  { href: '/map', label: 'Map', icon: Map },
  { href: '/reports', label: 'Reports', icon: ListChecks },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const fullscreen = path.startsWith('/live');
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return (
    <>
      {!fullscreen && (
        <header className="sticky top-0 z-[1000] border-b border-paper-200 bg-paper/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
          <div className="page flex h-16 items-center justify-between gap-4">
            <Logo />
            <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
              {NAV.map((n) => {
                // Live Drive needs a full page load (cross-origin isolation headers for multi-threaded AI).
                const Comp = n.href === '/live' ? 'a' : Link;
                return (
                <Comp key={n.href} href={n.href} aria-current={path.startsWith(n.href) ? 'page' : undefined} className={cn('flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition', path.startsWith(n.href) ? 'bg-white text-graphite shadow-soft ring-1 ring-paper-200' : 'text-graphite-soft hover:text-graphite')}>
                  <n.icon className="h-4 w-4" /> {n.label}
                </Comp>
                );
              })}
            </nav>
            <Link href="/admin" className="flex items-center gap-1.5 text-xs font-semibold text-graphite-muted hover:text-graphite">
              <ShieldCheck className="h-4 w-4" /> <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </div>
        </header>
      )}
      <main className={cn(!fullscreen && 'pb-28 md:pb-12')}>{children}</main>
      {!fullscreen && (
        <nav className="fixed inset-x-0 bottom-0 z-[1000] border-t border-paper-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden" aria-label="Main (mobile)">
          <div className="grid grid-cols-4">
            {NAV.map((n) => {
              const active = path.startsWith(n.href);
              const Comp = n.href === '/live' ? 'a' : Link;
              return (
                <Comp key={n.href} href={n.href} aria-current={active ? 'page' : undefined} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold">
                  <span className={cn('flex h-9 w-12 items-center justify-center rounded-2xl transition', n.href === '/report' ? 'bg-pothole-500 text-white shadow-soft' : active ? 'bg-road-50 text-road-600' : 'text-graphite-muted')}>
                    <n.icon className="h-5 w-5" />
                  </span>
                  <span className={active ? 'text-graphite' : 'text-graphite-muted'}>{n.label}</span>
                </Comp>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
