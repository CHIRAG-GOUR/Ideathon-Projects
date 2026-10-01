import { initializeApp, getApps, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Per-app settings come from functions/.env of each app (APP_ID, APP_NAME, DATABASE_ID, APP_ORIGIN),
 * so the same core code serves She Shield, Fortiva and Safety Warriors with fully separate data.
 */
export const APP = {
  id: process.env.APP_ID ?? 'safetycore',
  name: process.env.APP_NAME ?? 'Safety Core',
  databaseId: process.env.DATABASE_ID ?? '(default)',
  origin: process.env.APP_ORIGIN ?? 'http://127.0.0.1:5055',
};

let app: App | undefined;
let firestore: Firestore | undefined;

export function db(): Firestore {
  if (!firestore) {
    app = getApps().find((a) => a.name === APP.id) ?? initializeApp({}, APP.id);
    firestore = getFirestore(app, APP.databaseId);
    try {
      firestore.settings({ ignoreUndefinedProperties: true });
    } catch {
      /* already configured */
    }
  }
  return firestore;
}

export const auth = () => (db(), getAuth(app!));
export const bucket = () => (db(), getStorage(app!).bucket());

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const randomToken = (bytes = 18) => randomBytes(bytes).toString('base64url');
export function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}
export const nowIso = () => new Date().toISOString();
