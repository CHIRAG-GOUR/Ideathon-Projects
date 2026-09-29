import { z } from 'zod';
import { handle } from '@/server/http';
import { HttpError, requireAdmin } from '@/server/auth';
import { firestore } from '@/server/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    await requireAdmin(req);
    const { enabled } = z.object({ enabled: z.boolean() }).parse(await req.json());
    const ref = firestore().collection('vehicles').doc(params.id);
    if (!(await ref.get()).exists) throw new HttpError(404, 'Vehicle not found.');
    await ref.update({ enabled });
    return { id: params.id, enabled };
  });
}
