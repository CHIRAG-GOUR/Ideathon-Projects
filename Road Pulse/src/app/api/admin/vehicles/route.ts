import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { handle } from '@/server/http';
import { hashKey, requireAdmin } from '@/server/auth';
import { firestore } from '@/server/admin';
import type { Vehicle } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/admin/vehicles — register a vehicle. The device key is returned ONCE and stored only as a hash. */
export function POST(req: Request) {
  return handle(async () => {
    await requireAdmin(req);
    const { name } = z.object({ name: z.string().trim().min(2).max(60) }).parse(await req.json());
    const id = `veh_${randomBytes(5).toString('hex')}`;
    const key = randomBytes(24).toString('base64url');
    const v: Vehicle = { id, name, keyHash: hashKey(key), createdAt: new Date().toISOString(), lastSeenAt: null, lastLatitude: null, lastLongitude: null, detections: 0, enabled: true };
    await firestore().collection('vehicles').doc(id).set(v);
    return { id, name, key };
  });
}
