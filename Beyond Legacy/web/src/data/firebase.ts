// Firebase bootstrap. The config is never hard-coded:
//   1. VITE_FIREBASE_* environment variables (local development / CI), else
//   2. /__/firebase/init.json, which Firebase Hosting serves for the project the site is deployed to
//      (the Android app serves the same path from its build-time config, or from the deployed site).
// No config → the app runs as an on-device workspace and says so.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';

export interface FirebaseHandles { app: FirebaseApp; auth: Auth; db: Firestore; projectId: string; emulators: boolean }

let pending: Promise<FirebaseHandles | null> | null = null;

function envConfig() {
  const e = import.meta.env;
  return e.VITE_FIREBASE_API_KEY && e.VITE_FIREBASE_PROJECT_ID
    ? { apiKey: e.VITE_FIREBASE_API_KEY, authDomain: e.VITE_FIREBASE_AUTH_DOMAIN || `${e.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`, projectId: e.VITE_FIREBASE_PROJECT_ID, appId: e.VITE_FIREBASE_APP_ID }
    : null;
}

async function hostingConfig() {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch('/__/firebase/init.json', { signal: ctl.signal, cache: 'no-store' });
    clearTimeout(t);
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return null;
    const j = await r.json();
    return j && j.apiKey && j.projectId ? j : null;
  } catch {
    return null;
  }
}

/** Local emulators: opt in with ?emulators on localhost; remembered for the tab so reloads stay on the emulators. */
export function useEmulators(): boolean {
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) return false;
  try {
    if (new URLSearchParams(location.search).has('emulators')) sessionStorage.setItem('bl.emulators', '1');
    return sessionStorage.getItem('bl.emulators') === '1';
  } catch {
    return new URLSearchParams(location.search).has('emulators');
  }
}

export function firebase(): Promise<FirebaseHandles | null> {
  if (pending) return pending;
  pending = (async () => {
    const emulators = useEmulators();
    const config = emulators ? { apiKey: 'demo-key', projectId: 'demo-beyond-legacy', authDomain: 'localhost' } : envConfig() ?? (await hostingConfig());
    if (!config) return null;
    const app = initializeApp(config);
    const auth = getAuth(app);
    let db: Firestore;
    try {
      db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
    } catch {
      db = initializeFirestore(app, {});
    }
    if (emulators) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
    }
    return { app, auth, db, projectId: config.projectId, emulators };
  })();
  return pending;
}
