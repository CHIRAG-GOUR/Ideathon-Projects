import { onRequest } from 'firebase-functions/https';
import { onSchedule } from 'firebase-functions/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { z } from 'zod';
import { checkInSchema, locationSchema, opaqueId, sosSyncSchema, tripInputSchema } from '../../shared/src/schemas';
import { db, nowIso } from './admin';
import { HttpError, requireDevice, requireOwner, requireUser, router } from './http';
import { joinByToken, postMessage, respond, syncSos } from './sos';
import { acceptInvite, createInvite, describeInvite, removeContact, requestCheckIn } from './circle';
import { processTrips, startTrip, tripLocation, updateTrip } from './trips';
import { applyRetention, deleteAccount, deleteHistory, registerDevice } from './account';
import { mapProviderStatus, parseSmsConfig, validTwilioSignature } from './sms';

/** "none" or the SMS provider JSON (see sms.ts). Never shipped to the app or the browser. */
const SMS = defineSecret('SHEVOLUTION_SMS');
const ORIGIN = process.env.SHEVOLUTION_ORIGIN ?? 'https://shevolution-ideathon.web.app';
const REGION = 'asia-south1';

const smsConfig = () => parseSmsConfig(SMS.value());
const ctx = () => ({ sms: smsConfig(), origin: ORIGIN });

const api = router({
  'POST /device/register': async (req) => {
    const u = await requireUser(req);
    return registerDevice(u.uid, z.object({ label: z.string().max(60) }).parse(req.body).label);
  },

  // --- SOS (called by the Android safety layer, retried until acknowledged) ---
  'POST /sos/sync': async (req) => {
    const d = await requireDevice(req);
    return syncSos(d.uid, sosSyncSchema.parse(req.body), ctx());
  },
  'POST /track/join': async (req) => {
    const u = await requireUser(req); // anonymous sign-in is enough; the token is the authorisation
    return joinByToken(u.uid, z.object({ token: opaqueId }).parse(req.body).token);
  },
  'POST /sos/respond': async (req) => {
    const u = await requireUser(req);
    const b = z.object({ sosId: opaqueId, responding: z.boolean(), shareLocation: z.boolean(), location: locationSchema.nullable() }).parse(req.body);
    await respond(u.uid, b.sosId, b);
  },
  'POST /sos/message': async (req) => {
    const u = await requireUser(req);
    const b = z.object({ sosId: opaqueId, text: z.string().trim().min(1).max(300) }).parse(req.body);
    await postMessage(u.uid, b.sosId, b.text);
  },

  // --- Safety Circle ---
  'POST /contacts/invite': async (req) => {
    const u = await requireUser(req);
    return createInvite(u.uid, z.object({ contactId: z.string().min(1).max(64) }).parse(req.body).contactId, ORIGIN);
  },
  'POST /contacts/remove': async (req) => {
    const uid = await requireOwner(req);
    await removeContact(uid, z.object({ contactId: z.string().min(1).max(64) }).parse(req.body).contactId);
  },
  'GET /invite': async (req) => describeInvite(opaqueId.parse(req.query.token)),
  'POST /invite/accept': async (req) => {
    const u = await requireUser(req);
    return acceptInvite(u, z.object({ token: opaqueId }).parse(req.body).token);
  },
  'POST /checkin/request': async (req) => {
    const u = await requireUser(req);
    return requestCheckIn(u.uid, z.object({ ownerUid: z.string().min(1).max(128) }).parse(req.body).ownerUid);
  },

  // --- Safe Trip, Safety Timer, Check-in ---
  'POST /trips/start': async (req) => startTrip(await requireOwner(req), tripInputSchema.parse(req.body)),
  'POST /trips/update': async (req) => {
    const uid = await requireOwner(req);
    const b = z.object({ tripId: opaqueId, action: z.enum(['arrived', 'checked_in', 'cancelled', 'extend', 'escalated']), minutes: z.number().int().min(5).max(240).optional() }).parse(req.body);
    await updateTrip(uid, b.tripId, b.action, b.minutes);
  },
  'POST /trips/location': async (req) => {
    const d = await requireDevice(req);
    const b = z.object({ tripId: opaqueId, location: locationSchema }).parse(req.body);
    await tripLocation(d.uid, b.tripId, b.location);
  },
  'POST /checkins': async (req) => {
    const uid = await requireOwner(req);
    const b = checkInSchema.extend({ results: z.record(z.string()) }).parse(req.body);
    const ref = await db().collection(`users/${uid}/checkIns`).add({ ...b, at: nowIso() });
    return { id: ref.id };
  },

  // --- Privacy ---
  'POST /history/delete': async (req) => deleteHistory((await requireUser(req)).uid),
  'POST /account/delete': async (req) => deleteAccount((await requireUser(req)).uid),

  // --- SMS provider delivery receipts (Twilio status callback, signature-checked) ---
  'POST /sms/status': async (req) => {
    const cfg = smsConfig();
    const params = req.body as Record<string, string>;
    if (!cfg || !validTwilioSignature(cfg.authToken, `${ORIGIN}/api/sms/status`, params, req.get('x-twilio-signature') ?? '')) throw new HttpError(403, 'Bad signature');
    const status = mapProviderStatus(params.MessageStatus ?? '');
    const rec = (await db().collection('smsDeliveries').doc(params.MessageSid ?? '-').get()).data();
    if (status && rec) await db().doc(`sosEvents/${rec.sosId}`).update({ [`alerts.${rec.contactId}.sms.status`]: status, [`alerts.${rec.contactId}.sms.at`]: nowIso() });
  },
});

export const shevolutionApi = onRequest({ region: REGION, secrets: [SMS], maxInstances: 10, memory: '256MiB' }, api);

export const shevolutionTimers = onSchedule({ region: REGION, schedule: 'every 1 minutes', secrets: [SMS], memory: '256MiB' }, async () => {
  await processTrips(smsConfig());
});

export const shevolutionRetention = onSchedule({ region: REGION, schedule: 'every day 03:17', timeZone: 'Asia/Kolkata', memory: '256MiB' }, async () => {
  await applyRetention();
});
