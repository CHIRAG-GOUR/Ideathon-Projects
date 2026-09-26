import type { Metadata } from 'next';
import { DemoKit } from '@/components/demo/DemoKit';

export const metadata: Metadata = {
  title: 'Demo Barcodes',
  description: 'Print the six Visionary X demo barcodes and scan them with the live scanner.',
};

export default function DemoPage() {
  return <DemoKit />;
}
