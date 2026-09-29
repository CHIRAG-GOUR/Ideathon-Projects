import { handle } from '@/server/http';
import { HttpError, requireDevice } from '@/server/auth';
import { createVehicleEvent, vehicleEventSchema } from '@/server/reports';
import { rateLimit } from '@/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/vehicle/events — one confirmed pothole event from a paired vehicle / edge device (never raw video). */
export function POST(req: Request) {
  return handle(async () => {
    const vehicle = await requireDevice(req);
    if (!rateLimit(`veh:${vehicle.id}`, 120, 60_000)) throw new HttpError(429, 'Too many events from this vehicle.');
    const h = await createVehicleEvent(vehicle, vehicleEventSchema.parse(await req.json()));
    return { id: h.id, groupId: h.groupId, groupSize: h.groupSize, createdAt: h.createdAt };
  });
}
