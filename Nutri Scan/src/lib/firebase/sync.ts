'use client';

import type { FoodItem, ScanHistoryEntry, UsageEntry } from '@/types';
import { useKitchen } from '@/features/food/store';
import { FIRESTORE_DATABASE_ID, firebaseWebConfig } from './config';
import { useSyncStatus } from './syncStatus';

/**
 * Mirrors the local kitchen to Firestore, scoped to an anonymous Firebase user:
 *   users/{uid}                 profile
 *   users/{uid}/foods/{foodId}  inventory (with tombstones)
 *   users/{uid}/scans/{scanId}  recent scans
 *   users/{uid}/waste/{id}      used / wasted history
 * Loaded lazily after first paint; if Firebase is unavailable the app keeps working locally.
 */
let started = false;

const clean = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export async function startSync() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const status = useSyncStatus.getState();
  const cfg = firebaseWebConfig();
  if (!cfg) {
    status.set('disabled');
    return;
  }

  try {
    const [{ initializeApp, getApps }, authMod, fs] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
    const app = getApps()[0] ?? initializeApp(cfg);
    let db: import('firebase/firestore').Firestore;
    try {
      db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) }, FIRESTORE_DATABASE_ID);
    } catch {
      db = fs.getFirestore(app, FIRESTORE_DATABASE_ID);
    }
    const auth = authMod.getAuth(app);
    // Local development / tests only: talk to the Firebase emulators instead of production.
    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === '1') {
      authMod.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      fs.connectFirestoreEmulator(db, '127.0.0.1', 8080);
    }

    const updateOnline = () => useSyncStatus.getState().set(navigator.onLine ? 'synced' : 'offline');
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    authMod.onAuthStateChanged(auth, async (user) => {
      if (!user) {
        authMod.signInAnonymously(auth).catch(() => useSyncStatus.getState().set(navigator.onLine ? 'error' : 'offline'));
        return;
      }
      const uid = user.uid;
      useSyncStatus.getState().set('connecting', uid);
      try {
        await fs.setDoc(fs.doc(db, 'users', uid), { lastSeen: fs.serverTimestamp(), app: 'nutri-scan' }, { merge: true });
        const [foodsSnap, scansSnap, wasteSnap] = await Promise.all([
          fs.getDocs(fs.collection(db, 'users', uid, 'foods')),
          fs.getDocs(fs.query(fs.collection(db, 'users', uid, 'scans'), fs.orderBy('at', 'desc'), fs.limit(40))),
          fs.getDocs(fs.query(fs.collection(db, 'users', uid, 'waste'), fs.orderBy('at', 'desc'), fs.limit(500))),
        ]);
        const remoteFoods = foodsSnap.docs.map((d) => d.data() as FoodItem);
        useKitchen.getState().mergeRemote({
          foods: remoteFoods,
          scans: scansSnap.docs.map((d) => d.data() as ScanHistoryEntry),
          usage: wasteSnap.docs.map((d) => d.data() as UsageEntry),
        });

        // Track what the server already has, then push anything newer.
        const pushedFoods = new Map(remoteFoods.map((f) => [f.id, f.updatedAt]));
        const pushedScans = new Set(scansSnap.docs.map((d) => d.id));
        const pushedUsage = new Set(wasteSnap.docs.map((d) => d.id));
        let timer: ReturnType<typeof setTimeout> | undefined;

        const push = async () => {
          const s = useKitchen.getState();
          const foods = s.foods.filter((f) => pushedFoods.get(f.id) !== f.updatedAt);
          const scans = s.scans.filter((x) => !pushedScans.has(x.id));
          const usage = s.usage.filter((x) => !pushedUsage.has(x.id));
          if (!foods.length && !scans.length && !usage.length) {
            useSyncStatus.getState().set(navigator.onLine ? 'synced' : 'offline');
            return;
          }
          useSyncStatus.getState().set('saving');
          const batch = fs.writeBatch(db);
          foods.slice(0, 150).forEach((f) => batch.set(fs.doc(db, 'users', uid, 'foods', f.id), clean(f)));
          scans.slice(0, 100).forEach((x) => batch.set(fs.doc(db, 'users', uid, 'scans', x.id), clean(x)));
          usage.slice(0, 200).forEach((x) => batch.set(fs.doc(db, 'users', uid, 'waste', x.id), clean(x)));
          try {
            await batch.commit();
            foods.forEach((f) => pushedFoods.set(f.id, f.updatedAt));
            scans.forEach((x) => pushedScans.add(x.id));
            usage.forEach((x) => pushedUsage.add(x.id));
            useSyncStatus.getState().set(navigator.onLine ? 'synced' : 'offline');
          } catch {
            useSyncStatus.getState().set(navigator.onLine ? 'error' : 'offline');
          }
        };

        const schedule = () => {
          clearTimeout(timer);
          timer = setTimeout(push, 700);
        };
        useKitchen.subscribe(schedule);
        await push();
      } catch {
        useSyncStatus.getState().set(navigator.onLine ? 'error' : 'offline');
      }
    });
  } catch {
    useSyncStatus.getState().set(navigator.onLine ? 'error' : 'offline');
  }
}
