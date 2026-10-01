'use client';
import { createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut as fbSignOut, updateProfile } from 'firebase/auth';
import { auth, loadConfig } from './firebase';
import { invoke } from './native';

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/email-already-in-use': 'An account already uses this email. Log in instead.',
  'auth/weak-password': 'Use at least 8 characters.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/network-request-failed': 'No connection. Try again when you are online.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
  'auth/user-not-found': 'No account with this email.',
};
export const authMessage = (e: unknown) => MESSAGES[(e as { code?: string }).code ?? ''] ?? (e as Error).message;

async function ready() {
  if (!(await loadConfig())) throw Object.assign(new Error(), { code: 'auth/network-request-failed' });
}

export async function signUp(name: string, email: string, password: string) {
  await ready();
  if (password.length < 8) throw Object.assign(new Error(), { code: 'auth/weak-password' });
  const c = await createUserWithEmailAndPassword(auth(), email.trim(), password);
  await updateProfile(c.user, { displayName: name.trim() });
  sendEmailVerification(c.user).catch(() => undefined);
  return c.user;
}

export async function logIn(email: string, password: string) {
  await ready();
  return (await signInWithEmailAndPassword(auth(), email.trim(), password)).user;
}

export async function resetPassword(email: string) {
  await ready();
  await sendPasswordResetEmail(auth(), email.trim());
}

export async function signOut() {
  invoke('clearDevice');
  await fbSignOut(auth());
}
