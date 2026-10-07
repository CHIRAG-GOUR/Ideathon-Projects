'use client';
/**
 * Health Vault — the user's critical medical context, stored in their own Firestore document
 * (users/{uid}/medicalProfile/main), readable only by them. Responders get a temporary, scoped link created by
 * the server (/api/vault/token); each view is logged by the server into users/{uid}/healthAccessLogs.
 *
 * Security, stated exactly: data travels over HTTPS and Firestore encrypts it at rest (Google Cloud default).
 * Access is enforced by Firestore security rules and server-checked tokens. There is no additional end-to-end
 * encryption layer in this build, so the app does not claim one.
 */
import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { api } from '@core/api';
import { db } from '@core/firebase';
import { useDoc, useList } from '@core/data';
import { orderBy, query, limit } from 'firebase/firestore';

export interface Medication { name: string; dose: string }
export interface MedicalProfile {
  bloodGroup: string | null;
  allergies: string[];
  medications: Medication[];
  conditions: string[];
  emergencyNotes: string | null;
  emergencyContact: { name: string; relationship: string; phone: string } | null;
  doctor: { name: string; phone: string; clinic: string } | null;
  organDonor: boolean | null;
  updatedAt: string;
}
export const EMPTY_MEDICAL: MedicalProfile = { bloodGroup: null, allergies: [], medications: [], conditions: [], emergencyNotes: null, emergencyContact: null, doctor: null, organDonor: null, updatedAt: '' };

export const SCOPES = ['bloodGroup', 'allergies', 'medications', 'conditions', 'emergencyNotes', 'emergencyContact', 'doctor'] as const;
export type Scope = (typeof SCOPES)[number];
export const SCOPE_LABEL: Record<Scope, string> = { bloodGroup: 'Blood group', allergies: 'Allergies', medications: 'Current medications', conditions: 'Critical conditions', emergencyNotes: 'Emergency notes', emergencyContact: 'Emergency contact', doctor: 'Doctor' };
export const DEFAULT_SCOPE: Scope[] = ['bloodGroup', 'allergies', 'medications', 'conditions'];

export interface VaultToken { id: string; scope: Scope[]; createdAt: string; expiresAt: string; revoked: boolean; reason: 'manual' | 'sos'; views: number; lastViewedAt: string | null }
export interface AccessLog { id: string; kind: 'token_created' | 'token_revoked' | 'responder_view' | 'profile_updated'; actor: string; detail: string; at: string }

/** How complete the critical context is — what a responder needs first. */
export function readiness(m: MedicalProfile | null) {
  const items = [
    { key: 'blood', label: 'Blood group', ok: !!m?.bloodGroup },
    { key: 'allergies', label: 'Allergies reviewed', ok: !!m && (m.allergies.length > 0 || m.updatedAt !== '') },
    { key: 'meds', label: 'Medications', ok: !!m && (m.medications.length > 0 || m.updatedAt !== '') },
    { key: 'contact', label: 'Emergency contact', ok: !!m?.emergencyContact },
  ];
  return { items, score: items.filter((i) => i.ok).length / items.length };
}

export function useMedical(uid: string | null, demo: boolean): MedicalProfile | null | undefined {
  const d = useDoc<MedicalProfile>(!demo && uid ? `users/${uid}/medicalProfile/main` : null);
  if (demo) return DEMO_MEDICAL;
  if (d === null) return null;
  return d ? { ...EMPTY_MEDICAL, ...d } : d;
}
export async function saveMedical(uid: string, m: MedicalProfile) {
  const clean: MedicalProfile = {
    ...m,
    allergies: m.allergies.map((s) => s.trim()).filter(Boolean).slice(0, 20),
    conditions: m.conditions.map((s) => s.trim()).filter(Boolean).slice(0, 20),
    medications: m.medications.filter((x) => x.name.trim()).slice(0, 20),
    emergencyContact: m.emergencyContact?.name.trim() ? m.emergencyContact : null,
    doctor: m.doctor?.name.trim() ? m.doctor : null,
    emergencyNotes: m.emergencyNotes?.trim() || null,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db(), `users/${uid}/medicalProfile/main`), clean);
}

export const useVaultTokens = (uid: string | null) => useList<VaultToken>(uid ? `users/${uid}/vaultTokens` : null, (c) => query(c, orderBy('createdAt', 'desc'), limit(10)), [uid]);
export const useAccessLogs = (uid: string | null) => useList<AccessLog>(uid ? `users/${uid}/healthAccessLogs` : null, (c) => query(c, orderBy('at', 'desc'), limit(30)), [uid]);

export const createVaultLink = (scope: Scope[], minutes: number, reason: 'manual' | 'sos' = 'manual') => api<{ token: string; id: string; expiresAt: string }>('/vault/token', { scope, minutes, reason });
export const revokeVaultLink = (id: string) => api('/vault/token/revoke', { id });
export const responderUrl = (origin: string, token: string) => `${origin}/r/${token}`;

/** Remaining time, ticking every second. */
export function useCountdown(until: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!until) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [until]);
  const ms = until ? Math.max(0, Date.parse(until) - now) : 0;
  return { ms, label: `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`, expired: !!until && ms === 0 };
}

// ---------------------------------------------------------------------------------------------- demo
export const DEMO_MEDICAL: MedicalProfile = {
  bloodGroup: 'B+',
  allergies: [],
  medications: [{ name: 'Salbutamol inhaler', dose: '100 mcg, as needed' }],
  conditions: ['Mild asthma'],
  emergencyNotes: 'Wears contact lenses. Carries an inhaler in the left backpack pocket.',
  emergencyContact: { name: 'Demo Dad', relationship: 'Father', phone: '+910000000002' },
  doctor: { name: 'Dr. Demo Physician', phone: '+910000000009', clinic: 'Demo Family Clinic' },
  organDonor: true,
  updatedAt: '2026-09-28T10:12:00.000Z',
};
export const demoLogs = (): AccessLog[] => {
  const t = (m: number) => new Date(Date.now() - m * 60000).toISOString();
  return [
    { id: 'd1', kind: 'responder_view', actor: 'Emergency responder', detail: 'Viewed blood group, allergies, current medications, critical conditions', at: t(2) },
    { id: 'd2', kind: 'token_created', actor: 'You', detail: 'Responder link created · 15 min · 4 items', at: t(4) },
    { id: 'd3', kind: 'profile_updated', actor: 'You', detail: 'Medications updated', at: t(60 * 24 * 8) },
  ];
};
