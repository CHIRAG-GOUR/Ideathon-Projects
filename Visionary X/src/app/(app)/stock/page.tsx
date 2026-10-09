import type { Metadata } from 'next';
import { MyStock } from '@/components/stock/MyStock';

export const metadata: Metadata = { title: 'My Stock' };

export default function StockPage() {
  return <MyStock />;
}
