'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FbUser } from 'firebase/auth';
import { addDoc, collection, doc, limit, onSnapshot, orderBy, query, setDoc, updateDoc, where, type DocumentData, type Query } from 'firebase/firestore';
import type { CheckLogEntry, CheckPlan, EmergencyContact, SosEvent, User, UserSettings } from '@shared/types';
import { contactInputSchema } from '@shared/schemas';
import { auth, db, loadConfig } from './firebase';
import { api } from './api';

export const DEFAULT_SETTINGS: UserSettings = { sound: true, vibration: true, escalateAfterMin: 5, retentionDays: 30, trackingIntervalSec: 10, region: 'IN', volumeTrigger: false };

export function useAuthUser(): { user: FbUser | null; ready: boolean; cloud: boolean } {
  const [s, set] = useState<{ user: FbUser | null; ready: boolean; cloud: boolean }>({ user: null, ready: false, cloud: false });
  useEffect(() => {
    let off: (() => void) | undefined;
    let dead = false;
    loadConfig().then((ok) => {
      if (dead) return;
      if (!ok) return set({ user: null, ready: true, cloud: false }); // offline first launch: SOS on the phone still works
      off = onAuthStateChanged(auth(), (user) => set({ user, ready: true, cloud: true }));
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

export function useList<T>(path: string | null, build?: (c: ReturnType<typeof collection>) => Query, deps: unknown[] = []): T[] | undefined {
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

const ROLE_ORDER = { primary: 0, family: 1, emergency: 2, friend: 3 } as const;
export function useContacts(uid: string | null): EmergencyContact[] | undefined {
  const list = useList<EmergencyContact>(uid ? `users/${uid}/contacts` : null);
  return list?.slice().sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name));
}

export const useMyEvents = (uid: string | null, n = 50) => useList<SosEvent & { trailDeleted?: boolean }>(uid ? 'sosEvents' : null, (c) => query(c, where('ownerUid', '==', uid), orderBy('startedAt', 'desc'), limit(n)), [uid]);
export const useCheckPlan = (uid: string | null) => useDoc<CheckPlan>(uid ? `users/${uid}/checks/plan` : null);
export const useCheckLog = (uid: string | null, n = 60) => useList<CheckLogEntry>(uid ? `users/${uid}/checkLog` : null, (c) => query(c, orderBy('at', 'desc'), limit(n)), [uid]);

export async function saveProfile(uid: string, u: User) {
  await setDoc(doc(db(), `users/${uid}`), u);
}

export function normalizePhone(raw: string, region = 'IN'): string | null {
  const t = raw.replace(/[^\d+]/g, '');
  if (!t) return null;
  if (t.startsWith('+')) return t;
  const d = t.replace(/^0+/, '');
  if (region === 'IN' && d.length === 10) return `+91${d}`;
  return `+${d}`;
}

export type ContactDraft = Omit<EmergencyContact, 'id' | 'createdAt'>;

/** Validates and saves a contact (security rules check the same shape). Returns an error message or null. */
export async function saveContact(uid: string, draft: ContactDraft, id?: string): Promise<string | null> {
  const parsed = contactInputSchema.safeParse(draft);
  if (!parsed.success) {
    const f = parsed.error.issues[0]?.path[0];
    return f === 'phone' ? 'Enter the mobile number with country code, e.g. +91 98765 43210.' : f === 'email' ? 'Enter a valid email address.' : 'Check the name and details.';
  }
  if (!parsed.data.phone && !parsed.data.email) return 'Add a phone number or an email.';
  if ((parsed.data.channels.sms || parsed.data.channels.whatsapp) && !parsed.data.phone) return 'SMS and WhatsApp need a phone number.';
  if (parsed.data.channels.email && !parsed.data.email) return 'Email alerts need an email address.';
  try {
    if (id) await updateDoc(doc(db(), `users/${uid}/contacts/${id}`), parsed.data);
    else await addDoc(collection(db(), `users/${uid}/contacts`), { ...parsed.data, createdAt: new Date().toISOString() });
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

/** Through the API, so any live link the contact holds is revoked at the same time. */
export const removeContact = (contactId: string) => api('/contacts/remove', { contactId });
