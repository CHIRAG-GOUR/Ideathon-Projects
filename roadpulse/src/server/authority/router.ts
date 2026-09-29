import type { Address, RoadAuthority } from '@/types';

/**
 * Which authority handles this location? Pure function so it's easy to test.
 * An authority matches when every area field it specifies (country, state, district, city) equals the
 * geocoded address. The most specific match wins (city > district > state > country).
 */
const norm = (s: string | null | undefined) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(municipal corporation|nagar nigam|district|city)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function matchAuthority(address: Address | null, authorities: RoadAuthority[]): RoadAuthority | null {
  if (!address) return null;
  let best: { a: RoadAuthority; score: number } | null = null;
  for (const a of authorities) {
    if (!a.enabled) continue;
    const checks: [string | undefined, (string | null)[], number][] = [
      [a.country, [address.country, address.countryCode], 1],
      [a.state, [address.state], 2],
      [a.district, [address.district, address.city], 4],
      [a.city, [address.city, address.locality], 8],
    ];
    let score = 0, ok = true;
    for (const [want, have, w] of checks) {
      if (!want) continue;
      if (have.some((h) => norm(h) && norm(h) === norm(want))) score += w;
      else ok = false;
    }
    if (ok && score > 0 && (!best || score > best.score)) best = { a, score };
  }
  return best?.a ?? null;
}
