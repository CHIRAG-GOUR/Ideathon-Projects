import { handle } from '@/server/http';
import { requireDevice } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/vehicle/verify — used when pairing a device: checks the ID + key without creating anything. */
export function POST(req: Request) {
  return handle(async () => {
    const v = await requireDevice(req);
    return { id: v.id, name: v.name };
  });
}
