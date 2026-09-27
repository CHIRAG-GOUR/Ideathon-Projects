import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateRecipeSuggestions } from '@/lib/gemini';
import { clientKey, rateLimit } from '@/lib/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  items: z
    .array(z.object({ name: z.string().trim().min(1).max(60), daysLeft: z.number().int().min(-365).max(3650).nullable() }))
    .min(1)
    .max(8),
});

/** POST /api/recipes — 3 simple recipe ideas for food that should be used first. */
export async function POST(req: Request) {
  if (!rateLimit(`rcp:${clientKey(req)}`, 6, 60_000)) {
    return NextResponse.json({ ok: false, error: 'rate_limited', message: 'Too many requests.' }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid_request', message: 'Invalid request.' }, { status: 400 });
  const result = await generateRecipeSuggestions(parsed.data.items);
  const status = result.ok ? 200 : result.error === 'not_configured' ? 503 : result.error === 'timeout' ? 504 : result.error === 'rate_limited' ? 429 : 502;
  return NextResponse.json(result, { status });
}
