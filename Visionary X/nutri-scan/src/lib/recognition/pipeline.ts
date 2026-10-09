import type { ApiErrorCode, RecognitionResult, ScanResult } from '@/types';
import type { PreparedImage } from '@/lib/image/prepare';
import { classifyRecognition } from './classify';
import { parseRecognition } from './schema';

/**
 * Photo → secure server route → Gemini → validated → normalised ScanResult.
 * Only called when the user captures or uploads a photo — never on live camera frames.
 */
export type PipelineOutcome = { ok: true; result: ScanResult } | { ok: false; error: ApiErrorCode | 'offline'; message: string };

const FRIENDLY: Record<string, string> = {
  not_configured: 'AI recognition isn’t set up yet. You can still add food manually.',
  timeout: 'Couldn’t analyze that image. Try again.',
  bad_output: 'Couldn’t analyze that image. Try again.',
  rate_limited: 'Lots of scans at once — give it a few seconds and try again.',
  invalid_request: 'That image couldn’t be used. Try another photo.',
  failed: 'Couldn’t analyze that image. Try again.',
  offline: 'You’re offline. Your saved food is still available — scanning needs a connection.',
};

export function recognizePhoto(image: PreparedImage): Promise<PipelineOutcome> {
  return recognize({ image: image.base64, mimeType: image.mimeType }, 'photo');
}

/** Typed search: "2 aloo parathas with curd", "penne arrabbiata", "veg thali". */
export function recognizeQuery(query: string): Promise<PipelineOutcome> {
  return recognize({ query: query.trim().slice(0, 200) }, 'text');
}

const TEXT_FAIL = 'Couldn’t look that up. Try again, or add it manually.';

async function recognize(payload: Record<string, string>, from: 'photo' | 'text'): Promise<PipelineOutcome> {
  const out = await recognizeOnce(payload, from);
  if (!out.ok && from === 'text' && ['timeout', 'bad_output', 'failed'].includes(out.error)) return { ...out, message: TEXT_FAIL };
  return out;
}

async function recognizeOnce(payload: Record<string, string>, from: 'photo' | 'text'): Promise<PipelineOutcome> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, error: 'offline', message: FRIENDLY.offline };
  let data: RecognitionResult | null = null;
  try {
    const res = await fetch('/api/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(35_000),
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; data?: unknown; error?: ApiErrorCode } | null;
    if (!body || !body.ok) {
      const error = body?.error ?? 'failed';
      return { ok: false, error, message: FRIENDLY[error] ?? FRIENDLY.failed };
    }
    data = parseRecognition(body.data, { from }); // validate again on the client — never trust blindly
  } catch (err) {
    const error = (err as Error)?.name === 'TimeoutError' ? 'timeout' : 'failed';
    return { ok: false, error, message: FRIENDLY[error] };
  }
  if (!data) return { ok: false, error: 'bad_output', message: FRIENDLY.bad_output };
  return { ok: true, result: classifyRecognition(data) };
}
