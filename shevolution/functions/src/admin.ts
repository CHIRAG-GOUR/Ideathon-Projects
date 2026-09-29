import { initializeApp, getApps, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Shevolution's own Firestore database; other apps in the project are never touched. */
export const DATABASE_ID = 'shevolution';

let app: App | undefined;
let firestore: Firestore | undefined;

export function db(): Firestore {
  if (!firestore) {
    app = getApps().find((a) => a.name === 'shevolution') ?? initializeApp({}, 'shevolution');
    firestore = getFirestore(app, DATABASE_ID);
    firestore.settings({ ignoreUndefinedProperties: true });
  }
  return firestore;
}

export const auth = () => {
  db();
  return getAuth(app!);
};

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const randomToken = (bytes = 18) => randomBytes(bytes).toString('base64url');
export function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}

export const nowIso = () => new Date().toISOString();
