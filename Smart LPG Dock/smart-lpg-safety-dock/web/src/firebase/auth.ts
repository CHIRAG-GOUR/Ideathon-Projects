import { useEffect, useState } from 'react';
import { createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut as fbSignOut, updateProfile, type User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, cloudError, db, loadFirebase } from './firebase';

export function useAuth() {
  const [s, set] = useState<{ user: User | null; ready: boolean; cloud: boolean; error: string | null }>({ user: null, ready: false, cloud: false, error: null });
  useEffect(() => {
    let off: (() => void) | undefined;
    loadFirebase().then((ok) => {
      if (!ok) return set({ user: null, ready: true, cloud: false, error: cloudError });
      off = onAuthStateChanged(auth()!, (user) => set({ user, ready: true, cloud: true, error: null }));
    });
    return () => off?.();
  }, []);
  return s;
}

const MSG: Record<string, string> = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/email-already-in-use': 'An account already uses this email. Sign in instead.',
  'auth/weak-password': 'Use at least 6 characters.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/network-request-failed': 'No connection. Try again when you are online.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled in the Firebase project.',
  'auth/popup-closed-by-user': 'The Google sign-in window was closed.',
  'auth/unauthorized-domain': 'This domain is not authorised for sign-in in the Firebase project.',
};
export const authMessage = (e: unknown) => MSG[(e as { code?: string }).code ?? ''] ?? (e as Error).message;

async function ready() {
  if (!(await loadFirebase())) throw new Error(cloudError ?? 'Cloud unavailable');
}
async function profile(u: User, name?: string) {
  await setDoc(doc(db()!, 'users', u.uid), { displayName: name ?? u.displayName ?? '', email: u.email ?? null, updatedAt: new Date().toISOString() }, { merge: true });
}
export async function signUp(name: string, email: string, password: string) {
  await ready();
  const c = await createUserWithEmailAndPassword(auth()!, email.trim(), password);
  if (name.trim()) await updateProfile(c.user, { displayName: name.trim() });
  await profile(c.user, name.trim());
}
export async function signIn(email: string, password: string) {
  await ready();
  await signInWithEmailAndPassword(auth()!, email.trim(), password);
}
export async function signInGoogle() {
  await ready();
  const c = await signInWithPopup(auth()!, new GoogleAuthProvider());
  await profile(c.user);
}
export async function signOut() {
  await ready();
  await fbSignOut(auth()!);
}
