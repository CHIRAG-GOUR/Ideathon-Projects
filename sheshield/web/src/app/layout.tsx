import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/manrope';
import './globals.css';

export const metadata: Metadata = {
  title: 'She Shield — Protection that is always ready',
  description: 'Shield Mode, discreet alerts, protection checks and a real SOS that reaches the people you trust.',
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { themeColor: '#FBF9FE', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
