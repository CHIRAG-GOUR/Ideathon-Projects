import { useEffect, useState } from 'react';
import type { SimController } from './controller';

/** Re-render at most ~12×/s with the controller's latest state (3D reads the controller directly every frame). */
export function useSim(c: SimController, hz = 12) {
  const [, setV] = useState(0);
  useEffect(() => {
    let pending = false;
    let lastAt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = c.subscribe(() => {
      const now = performance.now();
      const wait = 1000 / hz - (now - lastAt);
      if (wait <= 0) {
        lastAt = now;
        setV((v) => v + 1);
      } else if (!pending) {
        pending = true;
        timer = setTimeout(() => {
          pending = false;
          lastAt = performance.now();
          setV((v) => v + 1);
        }, wait);
      }
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, [c, hz]);
  return c.state;
}
