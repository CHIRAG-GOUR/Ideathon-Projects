import { z } from 'zod';
import { handle } from '@/server/http';
import { requireDevice } from '@/server/auth';
import { firestore } from '@/server/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/vehicle/heartbeat — "vehicle is driving and monitoring" (position only, no images). */
export function POST(req: Request) {
  return handle(async () => {
    const v = await requireDevice(req);
    const b = z.object({ latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable() }).parse(await req.json());
    await firestore().collection('vehicles').doc(v.id).update({ lastSeenAt: new Date().toISOString(), ...(b.latitude != null && b.longitude != null ? { lastLatitude: b.latitude, lastLongitude: b.longitude } : {}) });
    return { ok: true };
  });
}
