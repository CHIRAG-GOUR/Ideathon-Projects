import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { handle } from '@/server/http';
import { hashKey } from '@/server/auth';
import { firestore } from '@/server/admin';
import type { Vehicle } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const registerSchema = z.object({
  vehicleNumber: z.string().trim().min(2).max(30),
  companyName: z.string().trim().max(60).optional().nullable(),
  modelName: z.string().trim().max(60).optional().nullable(),
  bluetoothName: z.string().trim().max(60).optional().nullable(),
});

/** POST /api/vehicle/register — instant on-demand driver registration by vehicle number, model, and company. */
export function POST(req: Request) {
  return handle(async () => {
    const data = registerSchema.parse(await req.json());
    const id = `veh_${randomBytes(5).toString('hex')}`;
    const key = randomBytes(24).toString('base64url');

    const parts = [data.vehicleNumber.toUpperCase()];
    if (data.modelName) parts.push(data.modelName);
    if (data.companyName) parts.push(`(${data.companyName})`);
    if (data.bluetoothName) parts.push(`[BT: ${data.bluetoothName}]`);

    const displayName = parts.join(' · ');

    const v: Vehicle = {
      id,
      name: displayName,
      keyHash: hashKey(key),
      createdAt: new Date().toISOString(),
      lastSeenAt: null,
      lastLatitude: null,
      lastLongitude: null,
      detections: 0,
      enabled: true,
    };

    await firestore().collection('vehicles').doc(id).set(v);
    return { id, key, name: displayName };
  });
}
