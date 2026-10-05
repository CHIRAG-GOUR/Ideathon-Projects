// Saved simulation sessions. Always kept on this device; also written to Firestore when signed in.
// Firebase is never in the path of the simulation itself.
import { useSyncExternalStore } from 'react';
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, where, writeBatch } from 'firebase/firestore';
import { CONFIG, type SimEvent } from '@engine/engine';
import type { SimController } from '@/simulation/controller';
import { auth, db, loadFirebase } from '@/firebase/firebase';
import { settings } from './settings';

export interface SessionSummary {
  id: string;
  scenario: 'with' | 'without';
  mode: 'scripted' | 'free';
  startedAt: string;
  durationSec: number;
  outcome: 'CONTAINED' | 'ESCALATION';
  peakGas: number;
  maxTemp: number;
  maxTilt: number;
  cylinderId: string;
  events: Pick<SimEvent, 't' | 'kind' | 'level' | 'text'>[];
  cloud: 'saved' | 'local' | 'failed';
  cloudError?: string;
}

const KEY = 'lpgdock.sessions.v1';
let list: SessionSummary[] = read();
const subs = new Set<() => void>();
function read(): SessionSummary[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}
function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* storage full/blocked */
  }
  subs.forEach((f) => f());
}
export const useSessions = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => list);

function summarise(c: SimController): SessionSummary {
  const s = c.state;
  return {
    id: c.sessionId,
    scenario: s.scenario,
    mode: s.mode,
    startedAt: new Date(c.startedAtWall).toISOString(),
    durationSec: Math.round(s.t * 10) / 10,
    outcome: s.outcome === 'CONTAINED' ? 'CONTAINED' : 'ESCALATION',
    peakGas: Math.max(...s.history.map((h) => h.gas)),
    maxTemp: Math.max(...s.history.map((h) => h.temp)),
    maxTilt: Math.max(...s.history.map((h) => h.tilt)),
    cylinderId: CONFIG.cylinderId,
    events: s.events.map(({ t, kind, level, text }) => ({ t, kind, level, text })),
    cloud: 'local',
  };
}

export async function saveToCloud(x: SessionSummary): Promise<SessionSummary> {
  if (!(await loadFirebase()) || !auth()?.currentUser) return x;
  const uid = auth()!.currentUser!.uid;
  try {
    const b = writeBatch(db()!);
    const { events, cloud: _c, cloudError: _e, ...rest } = x;
    b.set(doc(db()!, 'simulationSessions', x.id), { ...rest, ownerUid: uid, eventCount: events.length, createdAt: new Date().toISOString() });
    events.forEach((e, i) => b.set(doc(db()!, 'simulationEvents', `${x.id}_${String(i).padStart(3, '0')}`), { ...e, sessionId: x.id, ownerUid: uid }));
    await b.commit();
    return { ...x, cloud: 'saved' };
  } catch (e) {
    return { ...x, cloud: 'failed', cloudError: (e as Error).message };
  }
}

/** Saves each finished run once (local always; cloud when signed in and auto-save is on). */
export function attachPersistence(c: SimController) {
  let saved = '';
  return c.subscribe(async () => {
    if (c.state.outcome === 'NONE' || saved === c.sessionId) return;
    saved = c.sessionId;
    let x = summarise(c);
    list = [x, ...list];
    write();
    if (settings.get().autoSave) {
      x = await saveToCloud(x);
      list = list.map((y) => (y.id === x.id ? x : y));
      write();
    }
  });
}

export async function cloudSessions(): Promise<{ ok: boolean; items: Record<string, unknown>[]; error?: string }> {
  if (!(await loadFirebase()) || !auth()?.currentUser) return { ok: false, items: [], error: 'Sign in to see sessions saved to your account.' };
  try {
    const q = query(collection(db()!, 'simulationSessions'), where('ownerUid', '==', auth()!.currentUser!.uid), orderBy('startedAt', 'desc'), limit(25));
    return { ok: true, items: (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() })) };
  } catch (e) {
    return { ok: false, items: [], error: (e as Error).message };
  }
}

export async function deleteAll() {
  list = [];
  write();
  if (!(await loadFirebase()) || !auth()?.currentUser) return;
  const uid = auth()!.currentUser!.uid;
  for (const coll of ['simulationEvents', 'simulationSessions']) {
    const snap = await getDocs(query(collection(db()!, coll), where('ownerUid', '==', uid), limit(500)));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }
}

export async function savePresentation(chapters: number[], startedAt: number) {
  if (!(await loadFirebase()) || !auth()?.currentUser) return false;
  try {
    const b = writeBatch(db()!);
    b.set(doc(collection(db()!, 'presentationSessions')), { ownerUid: auth()!.currentUser!.uid, startedAt: new Date(startedAt).toISOString(), endedAt: new Date().toISOString(), chaptersViewed: chapters });
    await b.commit();
    return true;
  } catch {
    return false;
  }
}
