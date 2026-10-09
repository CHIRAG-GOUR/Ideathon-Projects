import type { z } from 'zod';
import type { EmergencyLocation, SafetyTrip } from '../../shared/src/types';
import type { tripInputSchema } from '../../shared/src/schemas';
import { EmergencyNumberService } from '../../shared/src/emergency';
import { SMS_TEMPLATES, fillSms, fmtTime } from '../../shared/src/message';
import { db, nowIso } from './admin';
import { HttpError } from './http';
import { loadContacts } from './sos';
import { sendSms, type SmsConfig } from './sms';

const tripRef = (uid: string, id: string) => db().doc(`users/${uid}/safetyTrips/${id}`);

export async function startTrip(uid: string, t: z.infer<typeof tripInputSchema>) {
  const now = new Date();
  const user = (await db().doc(`users/${uid}`).get()).data() ?? {};
  const trip: SafetyTrip & { ownerUid: string; ownerName?: string } = {
    id: t.id,
    ownerUid: uid,
    ownerName: user.name || 'Shevolution User',
    kind: t.kind,
    label: t.label,
    pickup: t.pickup ?? null,
    destination: t.destination,
    route: t.route ?? null,
    startedAt: now.toISOString(),
    dueAt: new Date(now.getTime() + t.minutes * 60_000).toISOString(),
    status: 'active',
    autoEscalate: t.autoEscalate,
    contactIds: t.contactIds,
    lastLocation: null,
    overdueAt: null,
    endedAt: null,
  };
  await tripRef(uid, t.id).set(trip);
  await db().doc(`sharedTrips/${t.id}`).set({ ...trip, updatedAt: now.toISOString() }).catch(() => undefined);
  return trip;
}

export async function updateTrip(uid: string, id: string, action: 'arrived' | 'checked_in' | 'cancelled' | 'extend' | 'escalated', minutes?: number) {
  const ref = tripRef(uid, id);
  const trip = (await ref.get()).data() as SafetyTrip | undefined;
  if (!trip) throw new HttpError(404, 'Trip not found');
  const sharedRef = db().doc(`sharedTrips/${id}`);
  if (action === 'extend') {
    const base = Math.max(Date.now(), Date.parse(trip.dueAt));
    const newDue = new Date(base + (minutes ?? 15) * 60_000).toISOString();
    await ref.update({ dueAt: newDue, status: 'active', overdueAt: null });
    await sharedRef.update({ dueAt: newDue, status: 'active', updatedAt: nowIso() }).catch(() => undefined);
  } else if (action === 'escalated') {
    await ref.update({ status: 'escalated', escalatedBy: 'device', escalatedAt: nowIso() });
    await sharedRef.update({ status: 'escalated', updatedAt: nowIso() }).catch(() => undefined);
  } else {
    await ref.update({ status: action, endedAt: nowIso() });
    await sharedRef.update({ status: action, endedAt: nowIso(), updatedAt: nowIso() }).catch(() => undefined);
  }
}

export async function tripLocation(uid: string, id: string, location: EmergencyLocation) {
  const ref = tripRef(uid, id);
  const trip = (await ref.get()).data() as SafetyTrip | undefined;
  if (!trip || !['active', 'overdue'].includes(trip.status)) return;
  if (!trip.lastLocation || Date.parse(location.timestamp) > Date.parse(trip.lastLocation.timestamp)) {
    await ref.update({ lastLocation: location });
    await db().doc(`sharedTrips/${id}`).update({ lastLocation: location, updatedAt: nowIso() }).catch(() => undefined);
  }
}

/**
 * Every minute: mark due trips/timers overdue. The phone asks "Are you safe?" itself and, if the user
 * enabled automatic escalation, texts the chosen contacts. This server step is the backup for a phone that
 * has gone silent (dead battery, no signal): 15 minutes after the due time it texts through the provider.
 */
export async function processTrips(sms: SmsConfig | null) {
  const now = new Date();
  const due = await db().collectionGroup('safetyTrips').where('status', '==', 'active').where('dueAt', '<=', now.toISOString()).limit(200).get();
  for (const d of due.docs) await d.ref.update({ status: 'overdue', overdueAt: now.toISOString() });

  const cutoff = new Date(now.getTime() - 15 * 60_000).toISOString();
  const stale = await db().collectionGroup('safetyTrips').where('status', '==', 'overdue').where('autoEscalate', '==', true).where('overdueAt', '<=', cutoff).limit(100).get();
  for (const d of stale.docs) {
    const trip = d.data() as SafetyTrip & { ownerUid: string };
    const user = (await db().doc(`users/${trip.ownerUid}`).get()).data() ?? {};
    const region = EmergencyNumberService.forRegion(user.settings?.region);
    const contacts = (await loadContacts(trip.ownerUid)).filter((c) => trip.contactIds.includes(c.id) && c.phone);
    const results: Record<string, string> = {};
    for (const c of contacts) {
      const body = fillSms(SMS_TEMPLATES.trip, { name: user.name || 'Your contact', location: trip.lastLocation, time: '', emergency: region.primary.number, label: trip.label, due: fmtTime(trip.dueAt, region.timeZone) });
      results[c.id] = (await sendSms(sms, c.phone!, body, null)).status;
    }
    await d.ref.update({ status: 'escalated', escalatedBy: 'server', escalatedAt: nowIso(), escalationResults: results });
  }
}
