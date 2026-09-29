import { NextResponse } from 'next/server';
import { HttpError, isAdminToken, requireUser } from '@/server/auth';
import { bucket } from '@/server/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/image?path=… — report photos are private: the report's owner and admins only. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const path = new URL(req.url).searchParams.get('path') ?? '';
    if (!/^(citizen|vehicle)\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.jpg$/.test(path)) throw new HttpError(400, 'Bad path');
    const own = path.startsWith(`citizen/${user.uid}/`);
    if (!own && !(await isAdminToken(user))) throw new HttpError(403, 'Not allowed');
    const [buf] = await bucket().file(path).download();
    return new NextResponse(new Uint8Array(buf), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600' } });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 404;
    return NextResponse.json({ ok: false }, { status });
  }
}
