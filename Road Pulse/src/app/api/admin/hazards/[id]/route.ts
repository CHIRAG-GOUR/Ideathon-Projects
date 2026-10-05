import { z } from 'zod';
import { handle } from '@/server/http';
import { HttpError, requireAdmin } from '@/server/auth';
import { firestore } from '@/server/admin';
import { ADMIN_STATUSES, STATUS_LABEL } from '@/server/authority/status';
import type { RoadHazard } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** PATCH /api/admin/hazards/:id — authority/admin review: Under Review, Assigned, Resolved, Rejected. */
export function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const admin = await requireAdmin(req);
    const { status, note } = z.object({ status: z.enum(ADMIN_STATUSES), note: z.string().trim().max(300).nullable().optional() }).parse(await req.json());
    const ref = firestore().collection('roadHazards').doc(params.id);
    const h = (await ref.get()).data() as RoadHazard | undefined;
    if (!h) throw new HttpError(404, 'Report not found.');
    const at = new Date().toISOString();
    const timeline = [...h.timeline, { key: 'status' as const, label: `${STATUS_LABEL[status]}${note ? ` — ${note}` : ''} (by ${admin.email})`, at }];
    await ref.update({ reportStatus: status, statusNote: note ?? null, timeline, updatedAt: at, reviewedBy: admin.email ?? null });
    return { id: h.id, reportStatus: status };
  });
}
