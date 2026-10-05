import { handle, clientIp } from '@/server/http';
import { HttpError, requireUser } from '@/server/auth';
import { citizenReportSchema, createCitizenReport } from '@/server/reports';
import { rateLimit } from '@/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/reports — create a citizen report, route it, submit it, return the real status. */
export function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser(req);
    if (!rateLimit(`rep:${user.uid}`, 6, 10 * 60_000) || !rateLimit(`repip:${clientIp(req)}`, 20, 10 * 60_000)) throw new HttpError(429, 'You’ve sent several reports in a short time. Please wait a few minutes.');
    return createCitizenReport(user.uid, citizenReportSchema.parse(await req.json()));
  });
}
