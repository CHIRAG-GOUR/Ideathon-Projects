import type { Metadata } from 'next';
import { SmartKitchen } from '@/features/simulation/SmartKitchen';

export const metadata: Metadata = { title: 'Smart Kitchen' };

export default function KitchenPage() {
  return <SmartKitchen />;
}
