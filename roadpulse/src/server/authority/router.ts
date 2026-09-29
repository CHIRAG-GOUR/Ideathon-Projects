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
  const fullLocalityText = [address.road, address.locality, address.city, address.district, address.displayName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let best: { a: RoadAuthority; score: number } | null = null;

  for (const a of authorities) {
    if (!a.enabled) continue;

    // 1. Specific Highway / Corridors check (e.g., NH-48, NH-21, NH-52, Ring Road)
    if (a.id.includes('nhai') || a.name.toLowerCase().includes('national highway')) {
      if (/\b(nh-?48|nh-?21|nh-?52|nh-?11|national highway|delhi road|expressway|ring road|bypass express)\b/i.test(fullLocalityText)) {
        return a;
      }
    }

    // 2. Specific Industrial Areas check (e.g. RIICO Sitapura, VKIA)
    if (a.id === 'auth_riico_sitapura' && /\b(sitapura|epip|chokhi dhani ind|ramchandrapura)\b/i.test(fullLocalityText)) {
      return a;
    }
    if (a.id === 'auth_riico_vkia' && /\b(vkia|vishwakarma|vki|road no 1|road no 5|road no 14|sikar road ind)\b/i.test(fullLocalityText)) {
      return a;
    }

    // 3. JDA Arterial & Masterplan Roads check
    if (a.id === 'auth_jaipur_jda' || a.name.toLowerCase().includes('development authority')) {
      if (/\b(jln marg|jawaharlal nehru|tonk road|gopalpura|mahal road|new sanganer road|prithviraj nagar|sirsi road|kalwar road|b2 bypass|flyover|jda)\b/i.test(fullLocalityText)) {
        return a;
      }
    }

    // 4. Heritage Walled City Zones check
    if (a.id === 'auth_jaipur_heritage') {
      if (/\b(walled city|pink city|johari|bapu bazar|chaura rasta|tripolia|mi road|civil lines|amer|jal mahal|raja park|adarsh nagar|tilak nagar|jawahar nagar|chandpole|surajpole|sanganeri gate|ajmeri gate)\b/i.test(fullLocalityText)) {
        return a;
      }
    }

    // 5. PWD City Divisions check
    if (a.id === 'auth_pwd_jaipur_city1' && /\b(central|east|gandhi nagar|bajaaj nagar|lalkothi|malviya nagar pwd)\b/i.test(fullLocalityText)) {
      return a;
    }
    if (a.id === 'auth_pwd_jaipur_city2' && /\b(west|south|sanganer pwd|mansarovar pwd|jhotwara pwd)\b/i.test(fullLocalityText)) {
      return a;
    }

    // 6. Standard hierarchical jurisdiction matching (city > district > state > country)
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
