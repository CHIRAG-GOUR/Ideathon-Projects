'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Reduced-motion preference that is safe to branch markup on: the server can't know the
 * preference, so this stays `false` for the first (hydrating) render and updates after mount.
 */
export function useCalmMotion(): boolean {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? Boolean(prefers) : false;
}
