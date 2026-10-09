'use client';

import { createStore, del, entries, get, set } from 'idb-keyval';

/**
 * Live Drive offline queue (IndexedDB). Confirmed pothole events wait here until the server confirms them,
 * so nothing is lost when the vehicle drives through a dead zone. Only events are stored — never video.
 */
export interface QueuedEvent {
  localId: string;
  trackId: string;
  confidence: number;
  box: { x: number; y: number; w: number; h: number };
  imageWidth: number;
  imageHeight: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  detectedAt: string;
  imageJpegBase64: string | null;
  attempts: number;
}

export interface Pairing {
  deviceId: string;
  deviceKey: string;
  name: string;
}

const store = () => createStore('roadpulse-live', 'events');
const cfg = () => createStore('roadpulse-live-cfg', 'cfg');

export const enqueue = (e: QueuedEvent) => set(e.localId, e, store());
export const pending = async () => (await entries<string, QueuedEvent>(store())).map(([, v]) => v).sort((a, b) => a.detectedAt.localeCompare(b.detectedAt));
export const remove = (id: string) => del(id, store());
export const getPairing = () => get<Pairing>('pairing', cfg());
export const setPairing = (p: Pairing | null) => (p ? set('pairing', p, cfg()) : del('pairing', cfg()));

export class DeviceError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function deviceFetch<T>(pairing: Pairing, path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Device-Id': pairing.deviceId, 'X-Device-Key': pairing.deviceKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; data?: T; message?: string } | null;
  if (!res.ok || !json?.ok) throw new DeviceError(res.status, json?.message ?? `Upload failed (${res.status})`);
  return json.data as T;
}

/** Upload one queued event; resolves with the server's event ID only after the server confirms. */
export async function uploadEvent(pairing: Pairing, e: QueuedEvent): Promise<{ id: string }> {
  const { localId: _l, attempts: _a, ...body } = e;
  const out = await deviceFetch<{ id: string }>(pairing, '/api/vehicle/events', body);
  await remove(e.localId);
  return out;
}
