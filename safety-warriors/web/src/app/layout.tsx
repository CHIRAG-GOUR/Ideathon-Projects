import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/sora';
import './globals.css';

export const metadata: Metadata = {
  title: 'Safety Warriors — Your Safety Toolkit',
  description: 'Step-by-step emergency playbooks, a safety toolkit, quick actions and a real SOS.',
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { themeColor: '#FFF8EC', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
