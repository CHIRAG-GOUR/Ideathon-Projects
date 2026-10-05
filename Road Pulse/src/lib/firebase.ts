'use client';

import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

/** Firebase client (lazy-loaded). RoadPulse uses its own Firestore database and Storage bucket. */
const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
export const DATABASE_ID = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || 'roadpulse';
export const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'roadpulse-ideathon';
export const firebaseConfigured = Boolean(cfg.apiKey && cfg.projectId && cfg.appId);
const EMULATORS = process.env.NEXT_PUBLIC_USE_EMULATORS === '1';

let p: Promise<{ app: FirebaseApp; auth: Auth; db: Firestore; storage: FirebaseStorage }> | null = null;

export function firebase() {
  if (!firebaseConfigured) return Promise.reject(new Error('Firebase isn’t configured for this site yet.'));
  if (!p) {
    p = (async () => {
      const [{ initializeApp, getApps }, authM, fsM, stM] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore'), import('firebase/storage')]);
      const app = getApps()[0] ?? initializeApp(cfg);
      const auth = authM.getAuth(app);
      const db = fsM.getFirestore(app, DATABASE_ID);
      const storage = stM.getStorage(app, `gs://${BUCKET}`);
      if (EMULATORS) {
        authM.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        fsM.connectFirestoreEmulator(db, '127.0.0.1', 8080);
        stM.connectStorageEmulator(storage, '127.0.0.1', 9199);
      }
      return { app, auth, db, storage };
    })();
  }
  return p;
}

function getCitizenId(): string {
  if (typeof window === 'undefined') return 'citizen_srv';
  let id = localStorage.getItem('roadpulse_citizen_id');
  if (!id) {
    id = `citizen_${crypto.randomUUID().replace(/-/g, '')}`;
    localStorage.setItem('roadpulse_citizen_id', id);
  }
  return id;
}

/** Citizens get an anonymous account or persistent client session the first time they report — no sign-up needed. */
export async function ensureUser(): Promise<User | { uid: string; getIdToken: () => Promise<string> }> {
  try {
    const { auth } = await firebase();
    const { signInAnonymously, onAuthStateChanged } = await import('firebase/auth');
    const existing = await new Promise<User | null>((res) => {
      const un = onAuthStateChanged(auth, (u) => {
        un();
        res(u);
      });
    });
    if (existing) return existing;
    return (await signInAnonymously(auth)).user;
  } catch {
    const uid = getCitizenId();
    return { uid, getIdToken: async () => uid };
  }
}

export async function currentUser(): Promise<User | { uid: string; getIdToken: () => Promise<string> } | null> {
  if (!firebaseConfigured) return { uid: getCitizenId(), getIdToken: async () => getCitizenId() };
  try {
    const { auth } = await firebase();
    const { onAuthStateChanged } = await import('firebase/auth');
    const u = await new Promise<User | null>((res) => {
      const un = onAuthStateChanged(auth, (u) => {
        un();
        res(u);
      });
    });
    return u ?? { uid: getCitizenId(), getIdToken: async () => getCitizenId() };
  } catch {
    return { uid: getCitizenId(), getIdToken: async () => getCitizenId() };
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Call our server with the user's ID token. Throws ApiError with the server's friendly message. */
export async function api<T>(path: string, init: { method?: string; body?: unknown; user?: User | { uid: string; getIdToken: () => Promise<string> } | null; headers?: Record<string, string> } = {}): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new ApiError(0, 'You’re offline. Nothing was lost — try again when you’re connected.');
  const user = init.user === undefined ? await ensureUser() : init.user;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers ?? {}) };
  if (user) {
    try {
      const tok = await user.getIdToken();
      if (tok && tok.length > 50) headers.Authorization = `Bearer ${tok}`;
      else headers['x-citizen-id'] = user.uid;
    } catch {
      headers['x-citizen-id'] = user.uid;
    }
  }
  let res: Response;
  try {
    res = await fetch(path, { method: init.method ?? (init.body ? 'POST' : 'GET'), headers, body: init.body ? JSON.stringify(init.body) : undefined, signal: AbortSignal.timeout(45_000) });
  } catch {
    throw new ApiError(0, 'Couldn’t reach RoadPulse. Check your connection and try again.');
  }
  const json = (await res.json().catch(() => null)) as { ok?: boolean; data?: T; message?: string } | null;
  if (!res.ok || !json?.ok) throw new ApiError(res.status, json?.message ?? 'Something went wrong. Please try again.');
  return json.data as T;
}

/** Private report photo (owner/admin) → object URL. */
export async function privateImage(path: string): Promise<string> {
  const user = await currentUser();
  if (!user) throw new Error('not signed in');
  const res = await fetch(`/api/image?path=${encodeURIComponent(path)}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
  if (!res.ok) throw new Error('image unavailable');
  return URL.createObjectURL(await res.blob());
}
