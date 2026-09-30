'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FbUser } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query, setDoc, where, limit, type DocumentData } from 'firebase/firestore';
import type { EmergencyContact, User, UserSettings } from '@shared/types';
import { auth, db, loadConfig } from './firebase';

export const DEFAULT_SETTINGS: UserSettings = {
  sound: true,
  vibration: true,
  autoCallContactId: null,
  escalateAfterMin: 5,
  retentionDays: 30,
  trackingIntervalSec: 10,
  region: 'IN',
  discreet: false,
  silenceSiren: false,
};

export function getStoredSettings(): UserSettings {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('shev.settings') : null;
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

export function saveStoredSettings(s: Partial<UserSettings>): UserSettings {
  try {
    const curr = getStoredSettings();
    const updated = { ...curr, ...s };
    if (typeof window !== 'undefined') {
      localStorage.setItem('shev.settings', JSON.stringify(updated));
    }
    return updated;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useAuthUser(): { user: FbUser | null; ready: boolean } {
  const [s, set] = useState<{ user: FbUser | null; ready: boolean }>({ user: null, ready: false });
  useEffect(() => {
    let off: (() => void) | undefined;
    let dead = false;
    loadConfig().then((ok) => {
      if (dead) return;
      if (!ok) return set({ user: null, ready: true }); // offline first launch: SOS still works locally
      off = onAuthStateChanged(auth(), (user) => set({ user, ready: true }));
    });
    return () => {
      dead = true;
      off?.();
    };
  }, []);
  return s;
}

export function useDoc<T>(path: string | null): T | null | undefined {
  const [v, set] = useState<T | null | undefined>(undefined);
  useEffect(() => {
    if (!path) return set(null);
    return onSnapshot(
      doc(db(), path),
      (s) => set(s.exists() ? ({ ...(s.data() as T), id: s.id } as T) : null),
      () => set(null),
    );
  }, [path]);
  return v;
}

export function useList<T>(path: string | null, build?: (c: ReturnType<typeof collection>) => ReturnType<typeof query>, deps: unknown[] = []): T[] | undefined {
  const [v, set] = useState<T[] | undefined>(undefined);
  useEffect(() => {
    if (!path) return set([]);
    const c = collection(db(), path);
    return onSnapshot(
      build ? build(c) : c,
      (s) => set(s.docs.map((d) => ({ ...(d.data() as DocumentData), id: d.id }) as T)),
      () => set([]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);
  return v;
}

export const useProfile = (uid: string | null) => useDoc<User>(uid ? `users/${uid}` : null);

export function useContacts(uid: string | null): EmergencyContact[] | undefined {
  const list = useList<EmergencyContact>(uid ? `users/${uid}/contacts` : null);
  return list?.slice().sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

export async function saveProfile(uid: string, u: Omit<User, 'uid'>) {
  await setDoc(doc(db(), `users/${uid}`), u);
}

export const myEventsQuery = (uid: string) => (c: ReturnType<typeof collection>) => query(c, where('ownerUid', '==', uid), orderBy('startedAt', 'desc'), limit(50));
export const circleAlertsQuery = (uid: string) => (c: ReturnType<typeof collection>) => query(c, where('contactUids', 'array-contains', uid), where('status', 'in', ['active', 'responding']));
