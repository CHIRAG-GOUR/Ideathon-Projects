import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { HttpError } from './auth';

/** Uniform JSON errors; never leaks stack traces or secrets. */
export async function handle(fn: () => Promise<unknown>) {
  try {
    const data = await fn();
    return NextResponse.json({ ok: true, data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ ok: false, message: err.message }, { status: err.status });
    if (err instanceof ZodError) return NextResponse.json({ ok: false, message: 'Some details were missing or invalid.', issues: err.issues.slice(0, 5).map((i) => i.path.join('.')) }, { status: 400 });
    console.error('[roadpulse]', (err as Error)?.message);
    return NextResponse.json({ ok: false, message: 'Something went wrong on our side. Your data is safe — please try again.' }, { status: 500 });
  }
}

export function clientIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}
