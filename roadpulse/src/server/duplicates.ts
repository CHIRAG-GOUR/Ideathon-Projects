import 'server-only';
import { distanceBetween, geohashQueryBounds } from 'geofire-common';
import { FieldValue } from 'firebase-admin/firestore';
import { firestore } from './admin';
import type { RoadHazard } from '@/types';

/** Same road hazard = within this radius, recently, and still open. */
export const DUPLICATE = { radiusM: 25, days: 60 } as const;
const CLOSED = new Set(['resolved', 'rejected']);

/**
 * Finds an existing open hazard at (about) the same spot. Individual reports are always kept —
 * they're only linked into a group ("4 reports for the same road hazard").
 */
export async function findGroup(lat: number, lon: number, now: Date): Promise<{ groupId: string; anchorId: string } | null> {
  const since = new Date(now.getTime() - DUPLICATE.days * 86400000).toISOString();
  const bounds = geohashQueryBounds([lat, lon], DUPLICATE.radiusM);
  const snaps = await Promise.all(bounds.map(([s, e]) => firestore().collection('roadHazards').orderBy('geohash').startAt(s).endAt(e).get()));
  let best: { d: number; h: RoadHazard } | null = null;
  for (const snap of snaps)
    for (const doc of snap.docs) {
      const h = doc.data() as RoadHazard;
      if (CLOSED.has(h.reportStatus) || h.createdAt < since) continue;
      const d = distanceBetween([lat, lon], [h.latitude, h.longitude]) * 1000;
      if (d <= DUPLICATE.radiusM && (!best || d < best.d)) best = { d, h };
    }
  return best ? { groupId: best.h.groupId ?? best.h.id, anchorId: best.h.id } : null;
}

/** Link a new hazard into its group (creating the group from the first report if needed). Returns group size. */
export async function joinGroup(groupId: string, anchorId: string, hazardId: string, lat: number, lon: number, source: string): Promise<number> {
  const db = firestore();
  const ref = db.collection('hazardGroups').doc(groupId);
  return db.runTransaction(async (tx) => {
    const g = await tx.get(ref);
    const ids: string[] = g.exists ? (g.get('hazardIds') as string[]) : [anchorId];
    if (!ids.includes(hazardId)) ids.push(hazardId);
    tx.set(ref, { id: groupId, hazardIds: ids, count: ids.length, latitude: lat, longitude: lon, lastReportAt: new Date().toISOString(), sources: FieldValue.arrayUnion(source) }, { merge: true });
    tx.set(db.collection('roadHazards').doc(anchorId), { groupId, groupSize: ids.length }, { merge: true });
    return ids.length;
  });
}
