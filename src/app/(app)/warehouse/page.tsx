import type { Metadata } from 'next';
import { WarehouseGame } from '@/components/warehouse/WarehouseGame';

export const metadata: Metadata = { title: '3D Warehouse' };

export default function WarehousePage() {
  return <WarehouseGame />;
}
