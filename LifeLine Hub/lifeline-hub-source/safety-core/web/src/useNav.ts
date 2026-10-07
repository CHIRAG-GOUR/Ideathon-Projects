'use client';
import { useCallback, useEffect, useState } from 'react';

/** In-app navigation that cooperates with the browser/Android back button (history entries, no page loads). */
export function useNav<S extends string>(initial: S) {
  const [stack, setStack] = useState<{ s: S; arg?: string }[]>([{ s: initial }]);
  useEffect(() => {
    const onPop = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const go = useCallback((s: S, arg?: string) => {
    window.history.pushState({ s }, '');
    setStack((st) => [...st, { s, arg }]);
  }, []);
  const tab = useCallback((s: S) => setStack([{ s }]), []);
  const back = useCallback(() => window.history.back(), []);
  const cur = stack[stack.length - 1];
  return { screen: cur.s, arg: cur.arg, depth: stack.length, go, tab, back };
}
