import type { Metadata } from 'next';
import { MyFood } from '@/features/inventory/MyFood';

export const metadata: Metadata = { title: 'My Food' };

export default function FoodPage() {
  return <MyFood />;
}
