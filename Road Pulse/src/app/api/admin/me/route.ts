import { handle } from '@/server/http';
import { isAdminToken, requireUser } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser(req);
    return { admin: await isAdminToken(user), email: user.email ?? null, emailVerified: Boolean(user.email_verified) };
  });
}
