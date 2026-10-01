import { FieldValue } from 'firebase-admin/firestore';
import type { ChatMessage, ContactAlert, EmergencyContact, EmergencyLocation, LiveSnapshot, Responder, SmsDelivery, SosEvent } from '../../shared/src/types';
import type { SosSync } from '../../shared/src/schemas';
import { EmergencyNumberService } from '../../shared/src/emergency';
import { TEMPLATES, fillMessage, fmtTime, liveUrl } from '../../shared/src/message';
import { APP, db, nowIso, randomToken, sha256 } from './admin';
import { HttpError } from './http';
import { sendSms, type SmsConfig } from './sms';

export const TOKEN_TTL_MS = 24 * 3600_000;
const OPEN = ['active', 'responding'];

export async function loadContacts(uid: string): Promise<EmergencyContact[]> {
  const snap = await db().collection(`users/${uid}/contacts`).get();
  const order = { primary: 0, family: 1, emergency: 2, friend: 3 } as const;
  return snap.docs.map((d) => ({ ...(d.data() as EmergencyContact), id: d.id })).sort((a, b) => order[a.role] - order[b.role]);
}

async function issueToken(sosId: string, ownerUid: string, contactId: string, tokenHash: string, startedAt: string) {
  await db().collection('shareTokens').doc(tokenHash).set({ sosId, ownerUid, contactId, expiresAt: new Date(Date.parse(startedAt) + TOKEN_TTL_MS).toISOString(), revoked: false }, { merge: true });
}

/**
 * Idempotent on sosId: the phone (or browser) re-sends the whole SOS until acknowledged.
 * One SOS id = one event = one alert round. Device SMS results are recorded as reported;
 * the server texts a contact itself only when the phone could not, and only once.
 */
export async function syncSos(uid: string, input: SosSync, sms: SmsConfig | null) {
  const ref = db().collection('sosEvents').doc(input.sosId);
  const user = (await db().doc(`users/${uid}`).get()).data() ?? {};
  const contacts = await loadContacts(uid);
  const region = EmergencyNumberService.forRegion(input.region);

  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      if (snap.get('ownerUid') !== uid) throw new HttpError(403, 'Not your SOS');
      return;
    }
    const event: SosEvent & { trailDeleted: boolean } = {
      id: input.sosId,
      ownerUid: uid,
      ownerName: user.name || 'Someone you know',
      ownerPhone: user.phone ?? null,
      status: 'active',
      trigger: input.trigger,
      startedAt: input.startedAt,
      endedAt: null,
      lastLocation: null,
      area: input.area,
      alerts: {},
      profile: user.profile?.shareMedical ? { bloodGroup: user.profile.bloodGroup ?? null, allergies: user.profile.allergies ?? null, medicalNotes: user.profile.medicalNotes ?? null } : null,
      battery: input.battery,
      network: input.network,
      responderCount: 0,
      region: region.region,
      source: input.source,
      trailDeleted: false,
    };
    tx.create(ref, event);
  });

  let event = (await ref.get()).data() as SosEvent;
  if (input.locations.length) {
    const batch = db().batch();
    for (const l of input.locations) batch.set(ref.collection('locations').doc(String(Date.parse(l.timestamp))), l);
    const newest = input.locations.reduce<EmergencyLocation>((a, b) => (Date.parse(b.timestamp) > Date.parse(a.timestamp) ? b : a), input.locations[0]);
    if (!event.lastLocation || Date.parse(newest.timestamp) > Date.parse(event.lastLocation.timestamp)) batch.update(ref, { lastLocation: newest });
    await batch.commit();
    event = (await ref.get()).data() as SosEvent;
  }
  if (OPEN.includes(event.status)) {
    for (const t of input.shareTokens) {
      const c = contacts.find((x) => x.id === t.contactId);
      if (c?.channels.live) await issueToken(event.id, uid, c.id, t.tokenHash, event.startedAt);
    }
  }

  const alerts: Record<string, ContactAlert> = { ...event.alerts };
  if (OPEN.includes(event.status)) {
    const time = fmtTime(event.startedAt, region.timeZone);
    for (const c of contacts) {
      const prev = alerts[c.id]?.sms;
      const dev = input.deviceSms.find((d) => d.contactId === c.id);
      let s: SmsDelivery;
      if (!c.channels.sms || !c.phone) s = { status: 'skipped', via: null, at: null };
      else if (prev?.via === 'provider') s = prev;
      else if (dev && ['submitted', 'delivered', 'pending'].includes(dev.status)) s = { status: dev.status, via: dev.via ?? 'device', at: dev.at };
      else if (!sms) s = dev ? { status: dev.status, via: dev.via, at: dev.at } : { status: 'not_configured', via: null, at: null, error: 'No SMS from this device and no server SMS provider' };
      else {
        let url: string | null = null;
        if (c.channels.live) {
          const token = randomToken();
          await issueToken(event.id, uid, c.id, sha256(token), event.startedAt);
          url = liveUrl(APP.origin, token);
        }
        const tpl = event.trigger === 'discreet' ? TEMPLATES.discreet : TEMPLATES.sos;
        const body = fillMessage(tpl, { brand: APP.name, name: event.ownerName, location: event.lastLocation, area: event.area, time, emergency: region.primary.number, liveUrl: url });
        const r = await sendSms(sms, c.phone, body, `${APP.origin}/api/sms/status`);
        if (r.providerId) await db().collection('smsDeliveries').doc(r.providerId).set({ sosId: event.id, contactId: c.id, ownerUid: uid, at: nowIso() });
        s = { status: r.status, via: 'provider', at: nowIso(), error: r.error };
      }
      alerts[c.id] = { contactId: c.id, name: c.name, role: c.role, sms: s, live: c.channels.live ? 'shared' : 'off' };
    }
  }

  const update: Record<string, unknown> = { alerts, battery: input.battery, network: input.network };
  if (input.area && !event.area) update.area = input.area;
  if (input.status !== 'active' && OPEN.includes(event.status)) {
    update.status = input.status;
    update.endedAt = input.endedAt ?? nowIso();
    await closeAccess(event.id);
    const words = input.status === 'safe' ? 'is SAFE now' : 'cancelled the SOS';
    for (const c of contacts) {
      if (alerts[c.id]?.sms.via === 'provider' && c.phone && sms) {
        await sendSms(sms, c.phone, fillMessage(TEMPLATES.update, { brand: APP.name, name: event.ownerName, location: null, time: fmtTime(update.endedAt as string, region.timeZone), emergency: '', status: words }), null);
      }
    }
  }
  await ref.update(update);
  const final = (await ref.get()).data() as SosEvent;
  const responders = await ref.collection('responders').where('responding', '==', true).get();
  return { status: final.status, alerts: final.alerts, responders: responders.docs.map((d) => d.get('name') as string) };
}

/** Ending an SOS or removing a contact cuts live-location access immediately. */
export async function closeAccess(sosId: string, contactId?: string) {
  let q = db().collection('shareTokens').where('sosId', '==', sosId);
  if (contactId) q = q.where('contactId', '==', contactId);
  const tokens = await q.get();
  const batch = db().batch();
  tokens.docs.forEach((d) => batch.update(d.ref, { revoked: true }));
  await batch.commit();
}

/** The token is the authorisation: random, per contact, expiring, revocable. Contacts need no account. */
async function byToken(token: string) {
  const t = (await db().collection('shareTokens').doc(sha256(token)).get()).data();
  if (!t || Date.parse(t.expiresAt) < Date.now()) throw new HttpError(404, 'This live-location link is not active. It may have expired, or the phone has not connected yet.');
  const ref = db().collection('sosEvents').doc(t.sosId);
  const event = (await ref.get()).data() as SosEvent | undefined;
  if (!event) throw new HttpError(404, 'This live-location link is not active.');
  const contact = (await db().doc(`users/${event.ownerUid}/contacts/${t.contactId}`).get()).data() as EmergencyContact | undefined;
  if (!contact) throw new HttpError(403, 'You are no longer in this trusted circle.');
  return { ref, event, contactId: t.contactId as string, contact, revoked: !!t.revoked };
}

export async function liveSnapshot(token: string): Promise<LiveSnapshot> {
  const { ref, event, contactId, contact, revoked } = await byToken(token);
  const open = OPEN.includes(event.status) && !revoked;
  const [locs, resp, msgs] = open
    ? await Promise.all([
        ref.collection('locations').orderBy('timestamp', 'desc').limit(40).get(),
        ref.collection('responders').get(),
        ref.collection('messages').orderBy('at', 'asc').limit(100).get(),
      ])
    : [null, null, null];
  const responders = (resp?.docs ?? []).map((d) => ({ ...(d.data() as Responder), id: d.id }));
  return {
    ownerName: event.ownerName,
    ownerPhone: open ? event.ownerPhone : null,
    status: event.status,
    trigger: event.trigger,
    startedAt: event.startedAt,
    endedAt: event.endedAt,
    lastLocation: open ? event.lastLocation : null,
    area: open ? event.area : null,
    trail: (locs?.docs ?? []).map((d) => d.data() as EmergencyLocation).reverse(),
    responders,
    messages: (msgs?.docs ?? []).map((d) => ({ ...(d.data() as ChatMessage), id: d.id })),
    battery: open ? event.battery : null,
    network: open ? event.network : null,
    region: event.region,
    you: { contactId, name: contact.name, responding: !!responders.find((r) => r.id === contactId)?.responding },
    profile: open ? event.profile : null,
  };
}

async function openByToken(token: string) {
  const r = await byToken(token);
  if (!OPEN.includes(r.event.status) || r.revoked) throw new HttpError(410, 'This SOS has ended.');
  return r;
}

export async function liveRespond(token: string, responding: boolean, location: EmergencyLocation | null) {
  const { ref, event, contactId, contact } = await openByToken(token);
  const rRef = ref.collection('responders').doc(contactId);
  await db().runTransaction(async (tx) => {
    const prev = await tx.get(rRef);
    const was = prev.exists && prev.get('responding') === true;
    tx.set(rRef, { name: contact.name, responding, location, at: nowIso() });
    if (responding !== was) tx.update(ref, { responderCount: FieldValue.increment(responding ? 1 : -1) });
    if (responding && event.status === 'active') tx.update(ref, { status: 'responding' });
  });
}

export async function liveMessage(token: string, text: string) {
  const { ref, contact } = await openByToken(token);
  await ref.collection('messages').add({ from: 'contact', name: contact.name, text, at: nowIso() });
}

export async function ownerMessage(uid: string, sosId: string, text: string) {
  const ref = db().collection('sosEvents').doc(sosId);
  const e = (await ref.get()).data() as SosEvent | undefined;
  if (!e || e.ownerUid !== uid) throw new HttpError(404, 'SOS not found');
  await ref.collection('messages').add({ from: 'owner', name: e.ownerName, text, at: nowIso() });
}
