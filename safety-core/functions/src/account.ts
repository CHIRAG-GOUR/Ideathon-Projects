import { db, auth, bucket, nowIso, randomToken, sha256 } from './admin';
import { closeAccess } from './sos';

export async function registerDevice(uid: string, label: string) {
  const id = randomToken(16);
  const key = randomToken(32);
  await db().collection('devices').doc(id).set({ uid, label: label.slice(0, 60), keyHash: sha256(key), createdAt: nowIso(), revoked: false });
  return { deviceId: id, deviceKey: key };
}

/** Removing a contact also revokes any live link they hold for an active SOS. */
export async function removeContact(uid: string, contactId: string) {
  const open = await db().collection('sosEvents').where('ownerUid', '==', uid).where('status', 'in', ['active', 'responding']).get();
  for (const e of open.docs) await closeAccess(e.id, contactId);
  await db().doc(`users/${uid}/contacts/${contactId}`).delete();
}

async function deleteEvents(uid: string, onlyEnded: boolean) {
  const events = await db().collection('sosEvents').where('ownerUid', '==', uid).get();
  for (const e of events.docs) {
    const open = ['active', 'responding'].includes(e.get('status'));
    if (onlyEnded && open) continue;
    if (open) await closeAccess(e.id);
    await db().recursiveDelete(e.ref);
  }
}

/** Ended SOS events (with trails) and the app's own history collections. An active SOS is kept. */
export async function deleteHistory(uid: string, collections: string[]) {
  await deleteEvents(uid, true);
  for (const coll of collections) await db().recursiveDelete(db().collection(`users/${uid}/${coll}`));
}

/** Everything: records, live links, device keys, stored files and the sign-in itself. */
export async function deleteAccount(uid: string) {
  await deleteEvents(uid, false);
  for (const coll of ['shareTokens']) {
    const docs = await db().collection(coll).where('ownerUid', '==', uid).get();
    for (const d of docs.docs) await d.ref.delete();
  }
  const devices = await db().collection('devices').where('uid', '==', uid).get();
  for (const d of devices.docs) await d.ref.delete();
  await db().recursiveDelete(db().doc(`users/${uid}`));
  try {
    await bucket().deleteFiles({ prefix: `users/${uid}/` });
  } catch {
    /* no storage in this app */
  }
  await auth().deleteUser(uid).catch(() => undefined);
}

/**
 * Daily: after an SOS ends, the precise trail, chat and responder positions are kept for the owner's
 * retention period (default 30 days), then only a summary remains. An SOS never ended closes after 48 h.
 */
export async function applyRetention() {
  const now = Date.now();
  const ended = await db().collection('sosEvents').where('status', 'in', ['safe', 'cancelled']).where('trailDeleted', '==', false).limit(300).get();
  for (const e of ended.docs) {
    const owner = (await db().doc(`users/${e.get('ownerUid')}`).get()).data();
    const days = owner?.settings?.retentionDays ?? 30;
    if (Date.parse(e.get('endedAt')) + days * 86_400_000 > now) continue;
    for (const sub of ['locations', 'messages', 'responders']) await db().recursiveDelete(e.ref.collection(sub));
    await e.ref.update({ trailDeleted: true, lastLocation: null });
  }
  const stale = await db().collection('sosEvents').where('status', 'in', ['active', 'responding']).where('startedAt', '<=', new Date(now - 48 * 3600_000).toISOString()).get();
  for (const e of stale.docs) {
    await closeAccess(e.id);
    await e.ref.update({ status: 'cancelled', endedAt: nowIso(), endedReason: 'Closed automatically: no end signal for 48 hours' });
  }
  const expired = await db().collection('shareTokens').where('expiresAt', '<=', new Date(now).toISOString()).limit(500).get();
  for (const t of expired.docs) await t.ref.delete();
}
