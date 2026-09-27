'use client';

import React, { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { useKitchen } from '@/features/food/store';
import { Toaster } from '@/components/ui/Toast';
import { BadgeWatcher } from './BadgeWatcher';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useKitchen.persist.rehydrate();

    // Firebase sync loads after the page is interactive, so it never slows first paint.
    const start = () => import('@/lib/firebase/sync').then((m) => m.startSync()).catch(() => undefined);
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
    if (idle) idle(start);
    else setTimeout(start, 1200);

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster />
      <BadgeWatcher />
    </MotionConfig>
  );
}
