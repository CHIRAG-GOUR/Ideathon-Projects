'use client';
// Firebase web SDK. Only the browser-safe public web config is used — no secrets. It comes from the build
// environment when set, otherwise from Firebase Hosting's reserved /__/firebase/init.json (cached for offline use),
// so the Android app needs no keys baked in.
import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, persistentLocalCache, type Firestore } from 'firebase/firestore';

export const DATABASE_ID = 'shevolution';
const CACHE = 'shev.firebaseConfig';

let config: FirebaseOptions | null = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  ? {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }
  : null;
let loading: Promise<boolean> | null = null;

async function fetchConfig(): Promise<FirebaseOptions | null> {
  try {
    const r = await fetch('/__/firebase/init.json', { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    const c = { apiKey: j.apiKey, authDomain: j.authDomain, projectId: j.projectId, appId: j.appId };
    if (!c.apiKey || !c.projectId) return null;
    try {
      localStorage.setItem(CACHE, JSON.stringify(c));
    } catch {
      /* no storage */
    }
    return c;
  } catch {
    return null;
  }
}

/** Resolves true when cloud features can be used. SOS on the phone never waits for this. */
export function loadConfig(): Promise<boolean> {
  if (config) return Promise.resolve(true);
  loading ??= (async () => {
    try {
      const cached = localStorage.getItem(CACHE);
      if (cached) {
        config = JSON.parse(cached);
        fetchConfig(); // refresh in the background
        return true;
      }
    } catch {
      /* ignore */
    }
    config = await fetchConfig();
    return !!config;
  })();
  return loading;
}

export const hasCloud = () => !!config;

let app: FirebaseApp | undefined;
let authInst: Auth | undefined;
let dbInst: Firestore | undefined;

function init() {
  if (app) return;
  if (!config) throw new Error('Cloud not available yet');
  app = getApps().find((a) => a.name === 'shevolution') ?? initializeApp(config, 'shevolution');
  authInst = getAuth(app);
  // Offline cache: the Safety Circle and history stay readable without a connection.
  dbInst = initializeFirestore(app, { localCache: persistentLocalCache() }, DATABASE_ID);
  if (process.env.NEXT_PUBLIC_USE_EMULATORS === '1') {
    connectAuthEmulator(authInst, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(dbInst, '127.0.0.1', 8080);
  }
}

export function auth(): Auth {
  init();
  return authInst!;
}
export function db(): Firestore {
  init();
  return dbInst!;
}
