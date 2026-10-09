import 'server-only';
import type { ApiErrorCode } from '@/types';
import { geminiConfig } from './config';

export class GeminiError extends Error {
  constructor(public code: ApiErrorCode, message: string) {
    super(message);
  }
}

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

interface GenerateOptions {
  model: string;
  system: string;
  parts: Part[];
  schema: unknown;
  maxOutputTokens: number;
  temperature?: number;
  /** Default thinking budget for this call; GEMINI_THINKING_BUDGET (if set) always wins. */
  thinkingBudget?: number;
}

interface GeminiApiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

/** Low-level call to generateContent with structured JSON output. Returns parsed JSON (unvalidated). */
export async function generateJson(opts: GenerateOptions): Promise<{ json: unknown; blocked: boolean }> {
  const cfg = geminiConfig();
  if (!cfg.apiKey) throw new GeminiError('not_configured', 'Gemini API key is not configured on the server.');

  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.1,
    maxOutputTokens: opts.maxOutputTokens,
    responseMimeType: 'application/json',
    responseSchema: opts.schema,
  };
  const thinking = cfg.thinkingBudget !== null && Number.isFinite(cfg.thinkingBudget) ? cfg.thinkingBudget : opts.thinkingBudget;
  if (thinking !== undefined) generationConfig.thinkingConfig = { thinkingBudget: thinking };

  let res: Response;
  try {
    res = await fetch(`${cfg.apiBase}/models/${encodeURIComponent(opts.model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: 'user', parts: opts.parts }],
        generationConfig,
      }),
      signal: AbortSignal.timeout(cfg.timeoutMs),
      cache: 'no-store',
    });
  } catch (err) {
    const name = (err as Error)?.name;
    if (name === 'TimeoutError' || name === 'AbortError') throw new GeminiError('timeout', 'Gemini took too long to respond.');
    throw new GeminiError('failed', 'Could not reach Gemini.');
  }

  if (res.status === 429) throw new GeminiError('rate_limited', 'Gemini rate limit reached.');
  if (!res.ok) {
    // Log status only — never the key or the image.
    console.error(`[gemini] HTTP ${res.status} for model ${opts.model}`);
    throw new GeminiError('failed', `Gemini request failed (${res.status}).`);
  }

  const body = (await res.json().catch(() => null)) as GeminiApiResponse | null;
  if (!body) throw new GeminiError('bad_output', 'Gemini returned an unreadable response.');
  if (body.promptFeedback?.blockReason) return { json: null, blocked: true };

  const candidate = body.candidates?.[0];
  if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'PROHIBITED_CONTENT') return { json: null, blocked: true };
  const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  if (!cleaned) throw new GeminiError('bad_output', 'Gemini returned an empty response.');
  try {
    return { json: JSON.parse(cleaned), blocked: false };
  } catch {
    throw new GeminiError('bad_output', 'Gemini returned malformed JSON.');
  }
}
