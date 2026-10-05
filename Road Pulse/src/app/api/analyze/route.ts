import { NextResponse } from 'next/server';
import { analyzeRoadHazardWithGemini } from '@/server/gemini/roadAnalysis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const imageBase64 = body.image || body.imageBase64;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ ok: false, message: 'Image data is required for distress analysis.' }, { status: 400 });
    }

    const analysis = await analyzeRoadHazardWithGemini(imageBase64);
    return NextResponse.json({ ok: true, data: analysis });
  } catch (err) {
    console.error('[Analyze API Error]:', err);
    return NextResponse.json(
      {
        ok: false,
        message: (err as Error).message || 'Distress analysis failed.',
      },
      { status: 500 }
    );
  }
}
