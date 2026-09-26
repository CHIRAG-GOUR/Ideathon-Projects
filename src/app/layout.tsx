import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers/Providers';

export const metadata: Metadata = {
  title: {
    default: 'Visionary X — Know what to sell first',
    template: '%s · Visionary X',
  },
  description:
    'Visionary X is a simple inventory assistant for grocery shops. Scan products, see expiry dates, organise your shelves and reduce avoidable waste.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="%232F8F55"/><path d="M18 40c0-12 10-22 28-22 0 18-10 28-22 28-3 0-6-2-6-6z" fill="%23FFF8EC"/><path d="M22 44c6-8 12-13 20-18" stroke="%232F8F55" stroke-width="3" stroke-linecap="round"/></svg>',
  },
};

export const viewport: Viewport = {
  themeColor: '#FFFBF3',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
