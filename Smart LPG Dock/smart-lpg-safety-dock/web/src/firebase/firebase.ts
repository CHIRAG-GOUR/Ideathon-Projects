// Firebase is optional: the simulation never depends on it. Config comes from Firebase Hosting's reserved
// /__/firebase/init.json at run time (no keys in the source). On other hosts / offline → cloud features off.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';

export const DATABASE_ID = '(default)';
const CACHE = 'lpgdock.firebaseConfig';
let app: FirebaseApp | null = null;
let authI: Auth | null = null;
let dbI: Firestore | null = null;
let loading: Promise<boolean> | null = null;
export let cloudError: string | null = null;

export function loadFirebase(): Promise<boolean> {
  loading ??= (async () => {
    let cfg: Record<string, string> | null = null;
    try {
      const r = await fetch('/__/firebase/init.json', { cache: 'no-store' });
      if (r.ok && (r.headers.get('content-type') ?? '').includes('json')) {
        cfg = await r.json();
        localStorage.setItem(CACHE, JSON.stringify(cfg));
      }
    } catch {
      /* offline */
    }
    if (!cfg) {
      try {
        cfg = JSON.parse(localStorage.getItem(CACHE) ?? 'null');
      } catch {
        cfg = null;
      }
    }
    if (!cfg?.apiKey) {
      cloudError = 'Cloud features are off: this copy is not served from Firebase Hosting (or is offline). The simulation works fully without them.';
      return false;
    }
    app = initializeApp(cfg);
    authI = getAuth(app);
    dbI = initializeFirestore(app, { localCache: persistentLocalCache() });
    if (location.hostname === 'localhost' && new URLSearchParams(location.search).has('emulators')) {
      connectAuthEmulator(authI, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(dbI, '127.0.0.1', 8080);
    }
    return true;
  })();
  return loading;
}
export const auth = () => authI;
export const db = () => dbI;
