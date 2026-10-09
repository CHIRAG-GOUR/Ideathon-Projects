import type { Metadata } from 'next';
import { ScannerScreen } from '@/features/scanner/ScannerScreen';

export const metadata: Metadata = { title: 'Scan' };

export default function ScanPage() {
  return <ScannerScreen />;
}
