import React from 'react';
import { AppNav } from '@/components/app/AppNav';
import { DemoCoach } from '@/components/app/DemoMode';

/** Application context: Home · Scan · My Stock · Warehouse. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <AppNav />
      <main>{children}</main>
      <DemoCoach />
    </div>
  );
}
