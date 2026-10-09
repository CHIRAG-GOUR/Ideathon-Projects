import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export function SiteFooter() {
  return (
    <footer className="no-print border-t border-cream-300 bg-cream-100">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
            Visionary X is a simple smart inventory assistant for grocery shops. Scan your stock, know what needs attention, put it in the
            right place and waste less.
          </p>
        </div>
        <FooterCol
          title="Product"
          links={[
            ['What it is', '/#what'],
            ['How it works', '/#how'],
            ['Use cases', '/#use-cases'],
          ]}
        />
        <FooterCol
          title="Try it"
          links={[
            ['Dashboard', '/dashboard'],
            ['Live scanner', '/scanner'],
            ['3D warehouse', '/warehouse'],
            ['My stock', '/stock'],
            ['After-expiry guide', '/after-expiry'],
          ]}
        />
        <FooterCol
          title="Demo kit"
          links={[
            ['Print demo barcodes', '/demo'],
            ['Presenter guide', '/demo#guide'],
          ]}
        />
      </div>
      <div className="border-t border-cream-300">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Visionary X · built for the Ideathon.</p>
          <p>Scan. Understand. Organise. Sell smarter.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-sm font-semibold text-ink-soft hover:text-leaf-700">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
