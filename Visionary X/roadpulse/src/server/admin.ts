import 'server-only';
import { applicationDefault, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

/**
 * Firebase Admin for the RoadPulse server. Uses the project's default credentials when deployed,
 * and the emulators locally (FIRESTORE_EMULATOR_HOST etc.). Only RoadPulse's own database and bucket.
 */
export const DATABASE_ID = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || 'roadpulse';
export const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'roadpulse-ideathon';
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'ideathon-projects';

let app: App | null = null;
let db: Firestore | null = null;

export function adminApp(): App {
  if (app) return app;
  const existing = getApps().find((a) => a.name === 'roadpulse');
  const emulated = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  app = existing ?? initializeApp({ projectId: PROJECT, storageBucket: BUCKET, ...(emulated ? {} : { credential: applicationDefault() }) }, 'roadpulse');
  return app;
}

export function firestore(): Firestore {
  // Cached on globalThis so dev hot-reloads don't try to configure the same Firestore instance twice.
  const g = globalThis as unknown as { __roadpulseDb?: Firestore };
  if (!g.__roadpulseDb) {
    const f = getFirestore(adminApp(), DATABASE_ID);
    try {
      f.settings({ ignoreUndefinedProperties: true });
    } catch {
      /* already configured (dev hot reload) — same settings */
    }
    g.__roadpulseDb = f;
  }
  return (db = g.__roadpulseDb);
}

export const adminAuth = () => getAuth(adminApp());
export const bucket = () => getStorage(adminApp()).bucket(BUCKET);
