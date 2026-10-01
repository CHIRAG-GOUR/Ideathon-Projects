import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/dm-sans';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fortiva — Your Safety Check Network',
  description: 'Scheduled safety check-ins that alert your Trusted Circle if you stop answering, plus a real SOS.',
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { themeColor: '#FFFCF8', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
