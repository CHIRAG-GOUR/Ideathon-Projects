import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import { adminAuth, firestore } from './admin';
import type { Vehicle } from '@/types';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Firebase ID token from `Authorization: Bearer …` (citizens use anonymous accounts). */
export async function requireUser(req: Request) {
  const h = req.headers.get('authorization') ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) throw new HttpError(401, 'Sign-in required.');
  try {
    return await adminAuth().verifyIdToken(token);
  } catch {
    throw new HttpError(401, 'Your session expired. Please reload the page.');
  }
}

/** Admins: verified email listed in config/admins (edited by the project owner in the console). */
export async function isAdminToken(t: { email?: string; email_verified?: boolean }): Promise<boolean> {
  if (!t.email || !t.email_verified) return false;
  const snap = await firestore().doc('config/admins').get();
  const emails = (snap.get('emails') as string[] | undefined) ?? [];
  return emails.map((e) => e.toLowerCase()).includes(t.email.toLowerCase());
}

export async function requireAdmin(req: Request) {
  const user = await requireUser(req);
  if (!(await isAdminToken(user))) throw new HttpError(403, 'Only RoadPulse administrators can do this.');
  return user;
}

export const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');

/** Vehicle / edge device: X-Device-Id + X-Device-Key (issued once by an admin, stored only as a hash). */
export async function requireDevice(req: Request): Promise<Vehicle> {
  const id = req.headers.get('x-device-id') ?? '';
  const key = req.headers.get('x-device-key') ?? '';
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(id) || key.length < 20) throw new HttpError(401, 'Device is not paired.');
  const snap = await firestore().collection('vehicles').doc(id).get();
  const v = snap.data() as Vehicle | undefined;
  const a = Buffer.from(hashKey(key)), b = Buffer.from(v?.keyHash ?? '');
  if (!v || a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(401, 'Device key is not valid.');
  if (!v.enabled) throw new HttpError(403, 'This vehicle has been disabled by an administrator.');
  return v;
}
