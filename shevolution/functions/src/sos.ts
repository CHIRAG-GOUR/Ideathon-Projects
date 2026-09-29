import { FieldValue } from 'firebase-admin/firestore';
import type { ContactAlert, EmergencyContact, EmergencyLocation, SmsDelivery, SosEvent } from '../../shared/src/types';
import type { SosSync } from '../../shared/src/schemas';
import { EmergencyNumberService } from '../../shared/src/emergency';
import { SMS_TEMPLATES, fillSms, fmtTime, trackingUrl } from '../../shared/src/message';
import { db, nowIso, randomToken, sha256 } from './admin';
import { HttpError } from './http';
import { sendSms, type SmsConfig } from './sms';
import { authorityFor } from './authorities';

export const TOKEN_TTL_MS = 24 * 3600_000;
const OPEN = ['active', 'responding'];

export interface Ctx {
  sms: SmsConfig | null;
  origin: string; // public site origin for links and callbacks
}

export async function loadContacts(uid: string): Promise<EmergencyContact[]> {
  const snap = await db().collection(`users/${uid}/contacts`).get();
  return snap.docs.map((d) => ({ ...(d.data() as EmergencyContact), id: d.id })).sort((a, b) => a.priority - b.priority);
}

const canShareLive = (c: EmergencyContact) => c.channels.live && c.verified && !!c.linkedUid;

async function issueToken(sosId: string, ownerUid: string, contactId: string, tokenHash: string, startedAt: string) {
  await db()
    .collection('shareTokens')
    .doc(tokenHash)
    .set({ sosId, ownerUid, contactId, expiresAt: new Date(Date.parse(startedAt) + TOKEN_TTL_MS).toISOString(), revoked: false }, { merge: true });
}

/** Idempotent: the phone re-sends the whole SOS until it gets an answer; one SOS id = one event = one alert round. */
export async function syncSos(uid: string, input: SosSync, ctx: Ctx) {
  const ref = db().collection('sosEvents').doc(input.sosId);
  const user = (await db().doc(`users/${uid}`).get()).data() ?? {};
  const contacts = await loadContacts(uid);
  const region = EmergencyNumberService.forRegion(input.region);
  const profile = user.profile?.shareMedical
    ? { age: user.profile.age ?? null, bloodGroup: user.profile.bloodGroup ?? null, allergies: user.profile.allergies ?? null, medicalNotes: user.profile.medicalNotes ?? null }
    : null;

  const created = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      if (snap.get('ownerUid') !== uid) throw new HttpError(403, 'Not your SOS');
      return false;
    }
    const event: SosEvent = {
      id: input.sosId,
      ownerUid: uid,
      ownerName: user.name || 'A Shevolution user',
      ownerPhone: user.phone ?? null,
      status: 'active',
      startedAt: input.startedAt,
      endedAt: null,
      lastLocation: null,
      contactIds: contacts.map((c) => c.id),
      contactUids: contacts.filter(canShareLive).map((c) => c.linkedUid!),
      alerts: {},
      authority: null,
      profile,
      battery: input.battery,
      network: input.network,
      escalatedAt: null,
      responderCount: 0,
      region: region.region,
    };
    tx.create(ref, { ...event, trailDeleted: false });
    return true;
  });

  let event = (await ref.get()).data() as SosEvent;

  // Location trail: doc id = fix time, so re-sent fixes are not duplicated.
  if (input.locations.length) {
    const batch = db().batch();
    for (const l of input.locations) batch.set(ref.collection('locations').doc(String(Date.parse(l.timestamp))), l);
    const newest = input.locations.reduce<EmergencyLocation>((a, b) => (Date.parse(b.timestamp) > Date.parse(a.timestamp) ? b : a), input.locations[0]);
    if (!event.lastLocation || Date.parse(newest.timestamp) > Date.parse(event.lastLocation.timestamp)) batch.update(ref, { lastLocation: newest });
    await batch.commit();
    event = (await ref.get()).data() as SosEvent;
  }

  // Live links the phone generated (raw token only ever lives on the phone and in the SMS).
  for (const t of input.shareTokens) {
    const c = contacts.find((x) => x.id === t.contactId);
    if (c && canShareLive(c) && OPEN.includes(event.status)) await issueToken(event.id, uid, c.id, t.tokenHash, event.startedAt);
  }

  const alerts: Record<string, ContactAlert> = { ...event.alerts };
  if (OPEN.includes(event.status)) {
    const time = fmtTime(event.startedAt, region.timeZone);
    for (const c of contacts) {
      const prev = alerts[c.id]?.sms;
      const dev = input.deviceSms.find((d) => d.contactId === c.id);
      let sms: SmsDelivery;
      if (!c.channels.sms || !c.phone) sms = { status: 'skipped', via: null, at: null };
      else if (prev?.via === 'provider') sms = prev;
      else if (dev && (dev.status === 'submitted' || dev.status === 'delivered' || dev.status === 'pending')) sms = { status: dev.status, via: dev.via ?? 'device', at: dev.at };
      else {
        // The phone could not send it (no permission / no signal / failed): the provider sends it, once.
        let liveUrl: string | null = null;
        if (ctx.sms && canShareLive(c)) {
          const token = randomToken();
          await issueToken(event.id, uid, c.id, sha256(token), event.startedAt);
          liveUrl = trackingUrl(token, ctx.origin);
        }
        const body = fillSms(SMS_TEMPLATES.sos, { name: event.ownerName, location: event.lastLocation, time, emergency: region.primary.number, liveUrl });
        const r = await sendSms(ctx.sms, c.phone, body, `${ctx.origin}/api/sms/status`);
        if (r.providerId) await db().collection('smsDeliveries').doc(r.providerId).set({ sosId: event.id, contactId: c.id, ownerUid: uid, at: nowIso() });
        sms = r.status === 'not_configured' && dev ? { status: dev.status, via: dev.via, at: dev.at } : { status: r.status, via: r.status === 'not_configured' ? null : 'provider', at: nowIso(), error: r.error };
      }
      alerts[c.id] = { contactId: c.id, name: c.name, relationship: c.relationship, priority: c.priority, sms, live: canShareLive(c) ? 'shared' : c.channels.live ? 'not_verified' : 'off' };
    }
  }

  const update: Record<string, unknown> = { alerts, battery: input.battery, network: input.network };
  if (created) update.authority = await (await authorityFor(region.region)).sendEmergencyAlert(event);

  if (input.status !== 'active' && OPEN.includes(event.status)) {
    update.status = input.status;
    update.endedAt = input.endedAt ?? nowIso();
    await closeAccess(event.id);
    // Contacts the provider texted get the outcome the same way; the phone texts its own recipients.
    const words = input.status === 'safe' ? 'has marked themselves SAFE' : 'cancelled the SOS';
    for (const c of contacts) {
      if (alerts[c.id]?.sms.via === 'provider' && c.phone) {
        await sendSms(ctx.sms, c.phone, fillSms(SMS_TEMPLATES.update, { name: event.ownerName, location: null, time: fmtTime(update.endedAt as string, region.timeZone), emergency: '', status: words }), null);
      }
    }
  }
  await ref.update(update);

  const responders = await ref.collection('responders').where('responding', '==', true).get();
  const final = (await ref.get()).data() as SosEvent;
  return {
    status: final.status,
    alerts: final.alerts,
    authority: final.authority,
    responders: responders.docs.map((d) => d.get('name') as string),
  };
}

/** Ending an SOS or removing a contact cuts off live-location access immediately. */
export async function closeAccess(sosId: string, contactId?: string) {
  let q = db().collection('shareTokens').where('sosId', '==', sosId);
  if (contactId) q = q.where('contactId', '==', contactId);
  const tokens = await q.get();
  const batch = db().batch();
  tokens.docs.forEach((d) => batch.update(d.ref, { revoked: true }));
  let vq = db().collection(`sosEvents/${sosId}/viewers`) as FirebaseFirestore.Query;
  if (contactId) vq = vq.where('contactId', '==', contactId);
  (await vq.get()).docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function joinByToken(uid: string, token: string) {
  const t = (await db().collection('shareTokens').doc(sha256(token)).get()).data();
  if (!t || t.revoked || Date.parse(t.expiresAt) < Date.now()) throw new HttpError(410, 'This live-location link has expired or was turned off.');
  const event = (await db().collection('sosEvents').doc(t.sosId).get()).data() as SosEvent | undefined;
  if (!event) throw new HttpError(410, 'This live-location link has expired or was turned off.');
  if (!OPEN.includes(event.status)) return { sosId: event.id, status: event.status, endedAt: event.endedAt, ownerName: event.ownerName };
  const contact = (await db().doc(`users/${event.ownerUid}/contacts/${t.contactId}`).get()).data() as EmergencyContact | undefined;
  if (!contact || !canShareLive({ ...contact, id: t.contactId })) throw new HttpError(403, 'You are no longer in this Safety Circle.');
  await db()
    .doc(`sosEvents/${event.id}/viewers/${uid}`)
    .set({ contactId: t.contactId, name: contact.name, relationship: contact.relationship, expiresAt: new Date(t.expiresAt), joinedAt: nowIso() });
  return { sosId: event.id, status: event.status, endedAt: null, ownerName: event.ownerName };
}

/** Who is this signed-in person to this SOS? (token viewer or linked, verified contact) */
export async function participant(uid: string, sosId: string) {
  const ref = db().collection('sosEvents').doc(sosId);
  const event = (await ref.get()).data() as SosEvent | undefined;
  if (!event) throw new HttpError(404, 'SOS not found');
  if (event.ownerUid === uid) return { event, role: 'owner' as const, name: event.ownerName, relationship: null };
  if (!OPEN.includes(event.status)) throw new HttpError(410, 'This SOS has ended');
  const v = (await ref.collection('viewers').doc(uid).get()).data();
  if (v && v.expiresAt.toDate() > new Date()) return { event, role: 'contact' as const, name: v.name as string, relationship: v.relationship as string };
  if (event.contactUids.includes(uid)) {
    const c = (await db().collection(`users/${event.ownerUid}/contacts`).where('linkedUid', '==', uid).limit(1).get()).docs[0]?.data();
    if (c) return { event, role: 'contact' as const, name: c.name as string, relationship: c.relationship as string };
  }
  throw new HttpError(403, 'Not authorised for this SOS');
}

export async function respond(uid: string, sosId: string, body: { responding: boolean; shareLocation: boolean; location: EmergencyLocation | null }) {
  const p = await participant(uid, sosId);
  if (p.role !== 'contact') throw new HttpError(400, 'Only contacts can respond');
  const ref = db().collection('sosEvents').doc(sosId);
  const rRef = ref.collection('responders').doc(uid);
  await db().runTransaction(async (tx) => {
    const prev = await tx.get(rRef);
    const was = prev.exists && prev.get('responding') === true;
    tx.set(rRef, { uid, name: p.name, relationship: p.relationship, responding: body.responding, shareLocation: body.shareLocation, location: body.shareLocation ? body.location : null, at: nowIso() });
    if (body.responding !== was) tx.update(ref, { responderCount: FieldValue.increment(body.responding ? 1 : -1) });
    if (body.responding && p.event.status === 'active') tx.update(ref, { status: 'responding' });
  });
}

export async function postMessage(uid: string, sosId: string, text: string) {
  const p = await participant(uid, sosId);
  await db().collection(`sosEvents/${sosId}/messages`).add({ uid, name: p.role === 'owner' ? p.event.ownerName : p.name, text, at: nowIso() });
}
