// Scheduled jobs (not triggered by the emulator's scheduler): run them directly against the Firestore emulator.
// Usage: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-shevolution node --import tsx tests/e2e/scheduled.mts
import { db } from '../../functions/src/admin';
import { processTrips } from '../../functions/src/trips';
import { applyRetention } from '../../functions/src/account';
import { parseSmsConfig } from '../../functions/src/sms';
import { check, done, fake, wipe } from './helpers.mjs';

await wipe();
const sms = parseSmsConfig(JSON.stringify({ provider: 'twilio', accountSid: 'ACtest', authToken: 't', from: '+15550001111', apiBase: 'http://127.0.0.1:4013' }));
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const uid = 'owner1';
await db().doc(`users/${uid}`).set({ name: 'Aanya', settings: { region: 'IN', retentionDays: 30 } });
await db().doc(`users/${uid}/contacts/bro`).set({ name: 'Brother', phone: '+919800000003', email: null, relationship: 'Sibling', priority: 2, channels: { sms: true, live: false, call: false }, verified: false, linkedUid: null });
const trip = (id: string, over: object) =>
  db().doc(`users/${uid}/safetyTrips/${id}`).set({ id, ownerUid: uid, kind: 'trip', label: 'Going home', destination: null, startedAt: ago(60), dueAt: ago(20), status: 'active', autoEscalate: true, contactIds: ['bro'], lastLocation: { latitude: 28.63, longitude: 77.21, accuracy: 15, altitude: null, speed: null, heading: null, timestamp: ago(25) }, overdueAt: null, endedAt: null, ...over });
await trip('due', {});
await trip('notyet', { dueAt: new Date(Date.now() + 600_000).toISOString() });
await trip('noauto', { autoEscalate: false });

await processTrips(sms);
const get = async (id: string) => (await db().doc(`users/${uid}/safetyTrips/${id}`).get()).data()!;
check('due trip becomes overdue (user is asked first)', (await get('due')).status === 'overdue');
check('trip not yet due is untouched', (await get('notyet')).status === 'active');
check('no text sent at the due time', (await fake()).sms.length === 0);

await db().doc(`users/${uid}/safetyTrips/due`).update({ overdueAt: ago(16) });
await db().doc(`users/${uid}/safetyTrips/noauto`).update({ overdueAt: ago(16) });
await processTrips(sms);
const log = await fake();
check('15 min after due with no answer: backup text to chosen contact', (await get('due')).status === 'escalated' && log.sms.length === 1 && log.sms[0].body.includes('SAFE TRIP OVERDUE') && log.sms[0].body.includes('Last known') === false && log.sms[0].body.includes('maps.google.com'));
check('auto-alert off: nobody is contacted', (await get('noauto')).status === 'overdue' && !log.sms.some((m: { body: string }) => m.body.includes('noauto')));
await processTrips(sms);
check('escalation is sent once', (await fake()).sms.length === 1);

// Retention
const ev = (id: string, over: object) => db().doc(`sosEvents/${id}`).set({ id, ownerUid: uid, status: 'safe', startedAt: ago(60 * 24 * 40), endedAt: ago(60 * 24 * 31), lastLocation: { latitude: 1, longitude: 2 }, trailDeleted: false, contactUids: [], ...over });
await ev('old', {});
await ev('recent', { endedAt: ago(60 * 24 * 2) });
await ev('stale', { status: 'active', endedAt: null, startedAt: ago(60 * 49) });
await db().doc('sosEvents/old/locations/1').set({ latitude: 1 });
await db().doc('sosEvents/recent/locations/1').set({ latitude: 1 });
await applyRetention();
const e = async (id: string) => (await db().doc(`sosEvents/${id}`).get()).data()!;
check('trail deleted after the retention period; summary kept', (await e('old')).trailDeleted === true && (await e('old')).lastLocation === null && (await db().collection('sosEvents/old/locations').get()).empty);
check('recent trail kept', (await e('recent')).trailDeleted === false && !(await db().collection('sosEvents/recent/locations').get()).empty);
check('an SOS never ended is closed after 48 h', (await e('stale')).status === 'cancelled');
done('SCHEDULED');
