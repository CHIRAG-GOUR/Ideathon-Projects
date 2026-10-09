'use client';

import React, { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { useShop } from '@/lib/store';

/** Restores saved shop progress after hydration and respects reduced-motion settings. */
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useShop.persist.rehydrate();
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
