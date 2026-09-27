import { NextResponse } from 'next/server';
import { geminiConfig } from '@/lib/gemini/config';

export const dynamic = 'force-dynamic';

/** GET /api/status — tells the UI whether AI recognition is configured (never exposes the key). */
export async function GET() {
  const cfg = geminiConfig();
  return NextResponse.json({ ai: Boolean(cfg.apiKey), model: cfg.model });
}
