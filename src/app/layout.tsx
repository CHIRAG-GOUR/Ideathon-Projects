import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { DemoGuideModal } from '@/components/common/DemoGuideModal';

export const metadata: Metadata = {
  title: 'Visionary X — Smart Grocery Inventory Demo',
  description:
    'Simple, interactive smart grocery inventory & waste prevention system for student demonstrations. Scan barcodes, check expiry dates, organize shelves, and eliminate food waste.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🥬</text></svg>',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#2D6A4F" />
      </head>
      <body className="min-h-screen bg-[#FBF9F5] text-[#1A2421] font-sans antialiased selection:bg-emerald-200 selection:text-emerald-950 flex flex-col justify-between">
        <div>
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </div>

        {/* Global Demo Guide Modal */}
        <DemoGuideModal />

        {/* Clean Light Footer */}
        <footer className="border-t border-[#EAE2D2] py-4 bg-[#FAF7F0] text-center text-xs text-gray-500">
          <p>Visionary X • Smart Grocery Inventory School Project Demo</p>
        </footer>
      </body>
    </html>
  );
}
