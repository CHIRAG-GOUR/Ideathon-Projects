import type { Request } from 'firebase-functions/https';
import type { Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { ZodError } from 'zod';
import { auth, db, safeEqualHex, sha256 } from './admin';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser(req: Request): Promise<DecodedIdToken> {
  const m = /^Bearer (.+)$/.exec(req.get('authorization') ?? '');
  if (!m) throw new HttpError(401, 'Sign in required');
  try {
    return await auth().verifyIdToken(m[1], true);
  } catch {
    throw new HttpError(401, 'Session expired — sign in again');
  }
}

export interface Device {
  id: string;
  uid: string;
}

/** The Android safety layer authenticates with a per-install key (stored only as a SHA-256 hash). */
export async function requireDevice(req: Request): Promise<Device> {
  const id = req.get('x-device-id') ?? '';
  const key = req.get('x-device-key') ?? '';
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(id) || key.length < 20) throw new HttpError(401, 'Device not registered');
  const snap = await db().collection('devices').doc(id).get();
  const d = snap.data();
  if (!d || d.revoked || !safeEqualHex(d.keyHash, sha256(key))) throw new HttpError(401, 'Device not registered');
  return { id, uid: d.uid };
}

/** Either a signed-in user or a registered device acting for its owner. */
export async function requireOwner(req: Request): Promise<string> {
  if (req.get('x-device-id')) return (await requireDevice(req)).uid;
  return (await requireUser(req)).uid;
}

type Handler = (req: Request) => Promise<unknown>;

export function router(routes: Record<string, Handler>) {
  return async (req: Request, res: Response) => {
    const path = req.path.replace(/^\/api/, '').replace(/\/$/, '');
    const handler = routes[`${req.method} ${path}`];
    res.set('Cache-Control', 'no-store');
    if (!handler) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    try {
      res.json((await handler(req)) ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) res.status(e.status).json({ error: e.message });
      else if (e instanceof ZodError) res.status(400).json({ error: 'Invalid request', issues: e.issues.slice(0, 5) });
      else {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
      }
    }
  };
}
