'use client';
import { auth, loadConfig } from './firebase';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Calls the app's Cloud Function (same origin via the Hosting rewrite) with the user's ID token. */
export async function api<T = unknown>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  const user = (await loadConfig()) ? auth().currentUser : null;
  const headers: Record<string, string> = {};
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'No connection. Try again when you are online.');
  }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (j as { error?: string }).error ?? `Request failed (${res.status})`);
  return j as T;
}

export function randomId(bytes = 16): string {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
