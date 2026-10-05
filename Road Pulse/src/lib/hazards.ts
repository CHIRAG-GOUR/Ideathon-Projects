'use client';

import type { RoadHazard } from '@/types';
import { firebase } from './firebase';
import { SEVERITY, STATUS, SOURCE, when } from './meta';
import type { HazardMarker } from '@/components/MapView';
import { esc } from '@/components/MapView';

/** Live subscription to the newest hazards (Firestore realtime). Returns an unsubscribe function. */
export async function watchHazards(opts: { max?: number; ownerUid?: string }, cb: (h: RoadHazard[]) => void, onError?: (e: Error) => void) {
  const { db } = await firebase();
  const { collection, query, orderBy, limit, where, onSnapshot } = await import('firebase/firestore');
  const base = collection(db, 'roadHazards');
  const q = opts.ownerUid ? query(base, where('ownerUid', '==', opts.ownerUid), orderBy('createdAt', 'desc'), limit(opts.max ?? 100)) : query(base, orderBy('createdAt', 'desc'), limit(opts.max ?? 500));
  return onSnapshot(q, (s) => cb(s.docs.map((d) => d.data() as RoadHazard)), (e) => onError?.(e));
}

export async function watchHazard(id: string, cb: (h: RoadHazard | null) => void) {
  const { db } = await firebase();
  const { doc, onSnapshot } = await import('firebase/firestore');
  return onSnapshot(doc(db, 'roadHazards', id), (s) => cb(s.exists() ? (s.data() as RoadHazard) : null));
}

export function toMarkers(list: RoadHazard[], link = true): HazardMarker[] {
  return list.map((h) => ({
    id: h.id,
    lat: h.latitude,
    lon: h.longitude,
    severity: h.severity,
    source: h.source,
    popup: `<div style="min-width:180px;font-size:13px;line-height:1.45">
      <div style="font-weight:700;font-size:14px">${esc(h.id)}</div>
      <div>${SOURCE[h.source].icon} ${esc(SOURCE[h.source].label)}</div>
      <div>Severity: <b style="color:${SEVERITY[h.severity].ink}">${esc(SEVERITY[h.severity].label)}</b>${h.severityEstimated ? ' (Vision sensor)' : ''}</div>
      <div>Status: <b>${esc(STATUS[h.reportStatus].label)}</b></div>
      ${h.groupSize > 1 ? `<div style="color:#8A5A06">${h.groupSize} reports for this hazard</div>` : ''}
      <div style="color:#747B83">${esc(when(h.createdAt))}</div>
      ${link ? `<a href="/reports/${encodeURIComponent(h.id)}" style="color:#2F6FDB;font-weight:600">Open report →</a>` : ''}
    </div>`,
  }));
}
