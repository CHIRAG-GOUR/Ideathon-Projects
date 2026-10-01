import { useEffect, useState } from 'react';

export type Route = 'dashboard' | 'simulation' | 'compare' | 'dock' | 'telemetry' | 'events' | 'present' | 'settings';
export const ROUTES: Route[] = ['dashboard', 'simulation', 'compare', 'dock', 'telemetry', 'events', 'present', 'settings'];

function parse() {
  const [p, q] = location.hash.replace(/^#\/?/, '').split('?');
  const route = (ROUTES.includes(p as Route) ? p : 'dashboard') as Route;
  return { route, params: new URLSearchParams(q ?? '') };
}

export function useRoute() {
  const [r, set] = useState(parse);
  useEffect(() => {
    const on = () => set(parse());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return r;
}

export function go(route: Route, params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  location.hash = `#/${route}${q}`;
  scrollTo({ top: 0 });
}
