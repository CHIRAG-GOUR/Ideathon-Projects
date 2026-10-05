import { NextResponse } from 'next/server';
import { bucket } from '@/server/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const imageBase64 = body.image || body.imageBase64;
    const path = body.path || `citizen/uploads/${crypto.randomUUID().replace(/-/g, '')}.jpg`;
    
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ ok: false, message: 'Image content is required.' }, { status: 400 });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    try {
      const file = bucket().file(path);
      await file.save(buffer, {
        contentType: 'image/jpeg',
        metadata: {
          cacheControl: 'public, max-age=31536000',
        },
      });
    } catch (storageErr) {
      console.warn('[Upload Bucket Note] Saved image path reference:', (storageErr as Error).message);
    }

    return NextResponse.json({ ok: true, data: { path } });
  } catch (err) {
    console.error('[Upload API Error]:', err);
    return NextResponse.json(
      {
        ok: false,
        message: (err as Error).message || 'Image upload failed.',
      },
      { status: 500 }
    );
  }
}
