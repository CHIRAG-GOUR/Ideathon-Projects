import type { Metadata } from 'next';
import { ScannerView } from '@/components/scanner/ScannerView';

export const metadata: Metadata = { title: 'Scan a Product' };

export default function ScannerPage() {
  return <ScannerView />;
}
