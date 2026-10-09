'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { DemoModeButton } from '@/components/app/DemoMode';
import { cn } from '@/lib/utils';

const LINKS = [
  { label: 'Home', href: '/' },
  { label: 'What It Is', href: '/#what' },
  { label: 'How It Works', href: '/#how' },
  { label: 'Use Cases', href: '/#use-cases' },
  { label: 'Scanner', href: '/scanner' },
  { label: 'Warehouse', href: '/warehouse' },
  { label: 'After Expiry', href: '/after-expiry' },
  { label: 'Demo', href: '/demo' },
];

/** Public website navigation (landing page + printable demo page). */
export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'no-print sticky top-0 z-50 transition-all duration-300',
        scrolled ? 'bg-background/90 shadow-[0_1px_0_rgba(74,56,30,0.08)] backdrop-blur-md' : 'bg-transparent'
      )}
    >
      <div className="container-page flex h-[72px] items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-cream-200 hover:text-ink',
                l.label === 'Home' && 'hidden xl:inline-flex'
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <DemoModeButton variant="ghost" className="px-3" label="short" />
          <Link href="/dashboard" className="btn btn-primary btn-sm">
            Try It <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <button
          className="btn btn-secondary h-11 w-11 p-0 lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-t border-cream-300 bg-background px-4 pb-6 pt-3 shadow-lift lg:hidden"
          >
            <nav className="grid gap-1" aria-label="Mobile">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-4 py-3 text-base font-semibold text-ink hover:bg-cream-200"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 grid gap-2">
              <Link href="/dashboard" onClick={() => setOpen(false)} className="btn btn-primary btn-md">
                Try It <ArrowRight className="h-4 w-4" />
              </Link>
              <DemoModeButton variant="secondary" size="md" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
