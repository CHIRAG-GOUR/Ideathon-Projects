import { z } from 'zod';
import { handle, clientIp } from '@/server/http';
import { HttpError, requireUser } from '@/server/auth';
import { previewRouting } from '@/server/reports';
import { rateLimit } from '@/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/route — address + which authority a report here would go to (before submitting). */
export function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser(req);
    if (!rateLimit(`route:${user.uid}:${clientIp(req)}`, 20, 60_000)) throw new HttpError(429, 'Too many lookups — wait a moment.');
    const { latitude, longitude } = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).parse(await req.json());
    return previewRouting(latitude, longitude);
  });
}
