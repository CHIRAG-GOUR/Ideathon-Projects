import { NextResponse } from 'next/server';
import { z } from 'zod';
import { recognizeImage, recognizeText } from '@/lib/gemini';
import { clientKey, rateLimit } from '@/lib/server/rateLimit';
import type { ApiErrorCode } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** ~1.4 MB of base64 ≈ 1 MB image. The client resizes to ~150–300 KB, so this is generous. */
const MAX_BASE64 = 1_400_000;

const imageBody = z.object({
  image: z.string().min(100).max(MAX_BASE64 + 64),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});
/** Typed search, e.g. "2 aloo parathas with curd". */
const textBody = z.object({ query: z.string().trim().min(2).max(200) });

const STATUS: Record<ApiErrorCode, number> = {
  not_configured: 503,
  timeout: 504,
  bad_output: 502,
  rate_limited: 429,
  invalid_request: 400,
  failed: 502,
  not_found: 404,
};

/** POST /api/recognize — photo (or typed food) in, validated RecognitionResult out. The image is never stored. */
export async function POST(req: Request) {
  if (!rateLimit(`rec:${clientKey(req)}`, 20, 60_000)) {
    return NextResponse.json({ ok: false, error: 'rate_limited', message: 'Too many scans in a minute. Take a breath and try again.' }, { status: 429 });
  }
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > MAX_BASE64 + 2048) {
    return NextResponse.json({ ok: false, error: 'invalid_request', message: 'Image is too large.' }, { status: 413 });
  }
  const body = await req.json().catch(() => null);
  const text = textBody.safeParse(body);
  if (text.success) {
    const result = await recognizeText(text.data.query);
    if (!result.ok) return NextResponse.json(result, { status: STATUS[result.error] });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  }
  const parsed = imageBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_request', message: 'Invalid image upload.' }, { status: 400 });
  }
  const base64 = parsed.data.image.replace(/^data:image\/[a-z]+;base64,/, '');
  if (!/^[A-Za-z0-9+/=]+$/.test(base64)) {
    return NextResponse.json({ ok: false, error: 'invalid_request', message: 'Invalid image data.' }, { status: 400 });
  }
  const result = await recognizeImage({ base64, mimeType: parsed.data.mimeType });
  if (!result.ok) return NextResponse.json(result, { status: STATUS[result.error] });
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
