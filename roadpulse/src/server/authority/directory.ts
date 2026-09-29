import 'server-only';
import { firestore } from '../admin';
import type { RoadAuthority } from '@/types';

/**
 * The authority directory lives in Firestore (`authorities`) and is managed by admins in the dashboard,
 * so new cities are added without code changes. Only verified official contacts should be entered —
 * each entry records the `sourceUrl` it was verified from.
 */
let cache: { at: number; list: RoadAuthority[] } | null = null;

export async function listAuthorities(fresh = false): Promise<RoadAuthority[]> {
  if (!fresh && cache && Date.now() - cache.at < 60_000) return cache.list;
  const snap = await firestore().collection('authorities').where('enabled', '==', true).get();
  const list = snap.docs.map((d) => ({ ...(d.data() as RoadAuthority), id: d.id }));
  cache = { at: Date.now(), list };
  return list;
}

export async function getAuthority(id: string): Promise<RoadAuthority | null> {
  const d = await firestore().collection('authorities').doc(id).get();
  return d.exists ? ({ ...(d.data() as RoadAuthority), id: d.id }) : null;
}
