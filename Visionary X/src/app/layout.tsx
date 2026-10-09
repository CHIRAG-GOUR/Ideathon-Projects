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
    icon: '/icon.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0F172A',
  colorScheme: 'dark light',
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
