import 'server-only';
import { firestore } from './admin';

/** Sequential, human-friendly IDs: RP-2026-001842 (citizen reports), VD-2026-000017 (vehicle detections). */
export async function nextId(prefix: 'RP' | 'VD', now = new Date()): Promise<string> {
  const year = now.getUTCFullYear();
  const ref = firestore().doc(`counters/${prefix}-${year}`);
  const n = await firestore().runTransaction(async (tx) => {
    const cur = ((await tx.get(ref)).get('value') as number | undefined) ?? 0;
    tx.set(ref, { value: cur + 1 }, { merge: true });
    return cur + 1;
  });
  return formatId(prefix, year, n);
}

export const formatId = (prefix: string, year: number, n: number) => `${prefix}-${year}-${String(n).padStart(6, '0')}`;
