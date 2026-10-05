import { handle } from '@/server/http';
import { HttpError, isAdminToken, requireUser } from '@/server/auth';
import { firestore } from '@/server/admin';
import { retrySubmission } from '@/server/reports';
import type { RoadHazard } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const user = await requireUser(req);
    const snap = await firestore().collection('roadHazards').doc(params.id).get();
    const h = snap.data() as RoadHazard | undefined;
    if (!h) throw new HttpError(404, 'Report not found.');
    if (h.ownerUid !== user.uid && !(await isAdminToken(user))) throw new HttpError(403, 'Not your report.');
    return retrySubmission(h);
  });
}
