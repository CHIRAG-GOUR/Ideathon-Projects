import type { Metadata } from 'next';
import { AfterExpiry } from '@/components/after-expiry/AfterExpiry';

export const metadata: Metadata = {
  title: 'After-Expiry Reuse Guide · Visionary X',
  description:
    'Turn waste into value with safe, practical ways to repurpose expired grocery items and recover shop value.',
};

export default function AfterExpiryPage() {
  return <AfterExpiry />;
}
