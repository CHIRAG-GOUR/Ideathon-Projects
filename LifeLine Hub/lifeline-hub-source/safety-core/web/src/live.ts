'use client';
import { useEffect, useRef, useState } from 'react';
import type { EmergencyLocation, LiveSnapshot } from '@shared/types';
import { ApiError } from './api';

/** A contact's live view: polls the token-protected snapshot (no account needed). */
export function useLive(token: string | null, everyMs = 4000) {
  const [snap, setSnap] = useState<LiveSnapshot | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!token) return;
    let dead = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/live?t=${encodeURIComponent(token)}`, { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (dead) return;
        if (!r.ok) setError({ status: r.status, message: j.error ?? 'This link is not active.' });
        else {
          setSnap(j);
          setError(null);
          setUpdatedAt(Date.now());
        }
      } catch {
        if (!dead) setError({ status: 0, message: 'No connection. Retrying…' });
      }
      if (!dead) timer.current = setTimeout(tick, everyMs);
    };
    tick();
    return () => {
      dead = true;
      clearTimeout(timer.current);
    };
  }, [token, everyMs]);

  const post = async (path: string, body: object) => {
    const r = await fetch(`/api${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, ...body }) });
    if (!r.ok) throw new ApiError(r.status, ((await r.json().catch(() => ({}))) as { error?: string }).error ?? 'Failed');
  };
  return {
    snap,
    error,
    updatedAt,
    respond: (responding: boolean, location: EmergencyLocation | null) => post('/live/respond', { responding, location }),
    message: (text: string) => post('/live/message', { text }),
  };
}

export function tokenFromPath(prefix = '/live/') {
  if (typeof location === 'undefined') return null;
  const p = location.pathname.startsWith(prefix) ? location.pathname.slice(prefix.length).split('/')[0] : new URLSearchParams(location.search).get('t');
  return p && /^[A-Za-z0-9_-]{16,64}$/.test(p) ? p : null;
}
