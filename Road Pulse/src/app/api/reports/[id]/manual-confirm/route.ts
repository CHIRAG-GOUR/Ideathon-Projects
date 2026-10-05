import { handle } from '@/server/http';
import { HttpError, requireUser } from '@/server/auth';
import { firestore } from '@/server/admin';
import type { RoadHazard } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The citizen says they completed the official portal submission. Recorded as their statement — not as authority confirmation. */
export function POST(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const user = await requireUser(req);
    const ref = firestore().collection('roadHazards').doc(params.id);
    const h = (await ref.get()).data() as RoadHazard | undefined;
    if (!h || h.ownerUid !== user.uid) throw new HttpError(404, 'Report not found.');
    if (h.reportStatus !== 'pending_manual_submission') throw new HttpError(409, 'This report isn’t waiting for a manual submission.');
    if (h.timeline.some((t) => t.key === 'manual_confirmed')) return h;
    const timeline = [...h.timeline, { key: 'manual_confirmed' as const, label: 'You confirmed you submitted it on the official channel', at: new Date().toISOString() }];
    await ref.update({ timeline, updatedAt: new Date().toISOString() });
    return { ...h, timeline };
  });
}
