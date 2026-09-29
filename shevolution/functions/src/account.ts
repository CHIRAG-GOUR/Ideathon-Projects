import { db, auth, nowIso, randomToken, sha256 } from './admin';
import { closeAccess } from './sos';

export async function registerDevice(uid: string, label: string) {
  const id = randomToken(16);
  const key = randomToken(32);
  await db().collection('devices').doc(id).set({ uid, label: label.slice(0, 60), keyHash: sha256(key), createdAt: nowIso(), revoked: false });
  return { deviceId: id, deviceKey: key };
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

/** "Delete history": ended SOS events (with trails), finished trips and check-ins. An active SOS is kept. */
export async function deleteHistory(uid: string) {
  await deleteEvents(uid, true);
  for (const coll of ['safetyTrips', 'checkIns', 'checkinRequests']) {
    const docs = await db().collection(`users/${uid}/${coll}`).get();
    for (const d of docs.docs) if (coll !== 'safetyTrips' || !['active', 'overdue'].includes(d.get('status'))) await d.ref.delete();
  }
}

/** "Delete account": every record, every live link, every device key, and the sign-in itself. */
export async function deleteAccount(uid: string) {
  await deleteEvents(uid, false);
  for (const coll of ['shareTokens', 'invites']) {
    const docs = await db().collection(coll).where('ownerUid', '==', uid).get();
    for (const d of docs.docs) await d.ref.delete();
  }
  const devices = await db().collection('devices').where('uid', '==', uid).get();
  for (const d of devices.docs) await d.ref.delete();
  // Where this person is someone else's contact: unlink (the owner keeps the name/number they typed).
  const links = await db().collectionGroup('contacts').where('linkedUid', '==', uid).get();
  for (const d of links.docs) await d.ref.update({ verified: false, linkedUid: null });
  const circles = await db().collection(`users/${uid}/circles`).get();
  for (const c of circles.docs) await db().doc(`users/${c.id}/contacts/${c.get('contactId')}`).update({ verified: false, linkedUid: null }).catch(() => undefined);
  await db().recursiveDelete(db().doc(`users/${uid}`));
  await auth().deleteUser(uid).catch(() => undefined);
}

/**
 * Daily retention. Active SOS keeps its full trail. After an SOS ends, the precise trail, chat and responder
 * positions are kept for the owner's retention period (default 30 days), then only a summary remains.
 */
export async function applyRetention() {
  const now = Date.now();
  const ended = await db().collection('sosEvents').where('status', 'in', ['safe', 'cancelled']).where('trailDeleted', '==', false).limit(300).get();
  for (const e of ended.docs) {
    const owner = (await db().doc(`users/${e.get('ownerUid')}`).get()).data();
    const days = owner?.settings?.retentionDays ?? 30;
    if (Date.parse(e.get('endedAt')) + days * 86_400_000 > now) continue;
    for (const sub of ['locations', 'messages', 'responders', 'viewers']) await db().recursiveDelete(e.ref.collection(sub));
    await e.ref.update({ trailDeleted: true, lastLocation: null });
  }
  // An SOS nobody ended (phone lost or destroyed) stops sharing after 48 hours.
  const stale = await db().collection('sosEvents').where('status', 'in', ['active', 'responding']).where('startedAt', '<=', new Date(now - 48 * 3600_000).toISOString()).get();
  for (const e of stale.docs) {
    await closeAccess(e.id);
    await e.ref.update({ status: 'cancelled', endedAt: nowIso(), endedReason: 'Closed automatically: no end signal for 48 hours' });
  }
  const expired = await db().collection('shareTokens').where('expiresAt', '<=', new Date(now).toISOString()).limit(500).get();
  for (const t of expired.docs) await t.ref.delete();
}
