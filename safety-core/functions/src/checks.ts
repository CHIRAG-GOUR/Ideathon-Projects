import type { z } from 'zod';
import type { CheckPlan, EmergencyLocation } from '../../shared/src/types';
import type { checkPlanInput } from '../../shared/src/schemas';
import { checkState, confirmPlan, startPlan, stopPlan } from '../../shared/src/checks';
import { EmergencyNumberService } from '../../shared/src/emergency';
import { TEMPLATES, fillMessage, fmtTime } from '../../shared/src/message';
import { APP, db, nowIso } from './admin';
import { HttpError } from './http';
import { loadContacts } from './sos';
import { sendSms, type SmsConfig } from './sms';

/**
 * Periodic safety checks. The phone runs the timeline itself (works offline) and reports what it did;
 * the server keeps the record and is the backup when the phone has gone silent (dead battery, no signal).
 */
const planRef = (uid: string) => db().doc(`users/${uid}/checks/plan`);
const log = (uid: string, type: string, extra: Record<string, unknown> = {}) => db().collection(`users/${uid}/checkLog`).add({ type, at: nowIso(), ...extra });
export const SERVER_SLACK_MIN = 5;

export async function startChecks(uid: string, input: z.infer<typeof checkPlanInput>, location: EmergencyLocation | null) {
  const plan = { ...startPlan(input), ownerUid: uid, lastLocation: location };
  await planRef(uid).set(plan);
  await log(uid, 'started', { note: `${input.label} · every ${input.intervalMin} min` });
  return plan;
}

export async function confirmCheck(uid: string, location: EmergencyLocation | null, at?: string) {
  const ref = planRef(uid);
  const p = (await ref.get()).data() as CheckPlan | undefined;
  if (!p?.active) throw new HttpError(409, 'No active safety check');
  const when = at ? Math.min(Date.now(), Date.parse(at)) : Date.now();
  const next = { ...confirmPlan(p, when), lastLocation: location ?? (p as { lastLocation?: unknown }).lastLocation ?? null };
  await ref.set(next, { merge: true });
  await log(uid, 'confirmed', { location });
  return next;
}

export async function stopChecks(uid: string) {
  const ref = planRef(uid);
  const p = (await ref.get()).data() as CheckPlan | undefined;
  if (!p?.active) return;
  await ref.set(stopPlan(p), { merge: true });
  await log(uid, 'stopped');
}

/** What the phone did on its own (possibly hours ago, offline): recorded as it happened. */
export async function deviceCheckEvent(uid: string, type: 'warning' | 'missed' | 'escalated' | 'sos', at: string, location: EmergencyLocation | null) {
  await log(uid, type, { at, location, by: 'device' });
  if (type === 'escalated' || type === 'sos') await planRef(uid).set({ escalatedAt: at, escalatedBy: 'device', updatedAt: nowIso() }, { merge: true });
}

/** Every minute: escalate missed checks the phone did not handle (server backup), per the user's policy. */
export async function processChecks(sms: SmsConfig | null) {
  const now = Date.now();
  const due = await db().collectionGroup('checks').where('active', '==', true).where('nextDueAt', '<=', new Date(now).toISOString()).limit(300).get();
  for (const d of due.docs) {
    const p = d.data() as CheckPlan & { ownerUid: string; lastLocation?: EmergencyLocation | null };
    if (checkState(p, now) !== 'ESCALATED' || p.escalatedAt) continue;
    const escalateAt = Date.parse(p.nextDueAt!) + 2 * p.graceMin * 60_000 + SERVER_SLACK_MIN * 60_000;
    if (now < escalateAt) continue; // the phone gets the first chance
    const user = (await db().doc(`users/${p.ownerUid}`).get()).data() ?? {};
    const region = EmergencyNumberService.forRegion(user.settings?.region);
    const contacts = (await loadContacts(p.ownerUid)).filter((c) => p.contactIds.includes(c.id) && c.phone && c.channels.sms);
    const results: Record<string, string> = {};
    for (const c of contacts) {
      const body = fillMessage(TEMPLATES.check, { brand: APP.name, name: user.name || 'Your contact', location: p.lastLocation ? { ...p.lastLocation, lastKnown: true } : null, time: '', emergency: region.primary.number, label: p.label, due: fmtTime(p.nextDueAt!, region.timeZone) });
      results[c.id] = (await sendSms(sms, c.phone!, body, null)).status;
    }
    await d.ref.set({ escalatedAt: nowIso(), escalatedBy: 'server', updatedAt: nowIso() }, { merge: true });
    await log(p.ownerUid, 'missed', { by: 'server' });
    await log(p.ownerUid, 'escalated', { by: 'server', results });
  }
}
