import { FieldValue } from 'firebase-admin/firestore';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { EmergencyContact } from '../../shared/src/types';
import { db, nowIso, randomToken, sha256 } from './admin';
import { HttpError } from './http';
import { closeAccess } from './sos';

const INVITE_TTL_MS = 7 * 24 * 3600_000;
const mask = (s: string | null, keep: number) => (s ? '•'.repeat(Math.max(0, s.length - keep)) + s.slice(-keep) : null);

export async function createInvite(ownerUid: string, contactId: string, origin: string) {
  const c = await db().doc(`users/${ownerUid}/contacts/${contactId}`).get();
  if (!c.exists) throw new HttpError(404, 'Contact not found');
  const token = randomToken();
  await db().collection('invites').doc(sha256(token)).set({ ownerUid, contactId, expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(), usedBy: null });
  return { url: `${origin}/join/${token}` };
}

async function loadInvite(token: string) {
  const ref = db().collection('invites').doc(sha256(token));
  const inv = (await ref.get()).data();
  if (!inv || Date.parse(inv.expiresAt) < Date.now()) throw new HttpError(410, 'This invitation has expired. Ask for a new one.');
  const contact = (await db().doc(`users/${inv.ownerUid}/contacts/${inv.contactId}`).get()).data() as EmergencyContact | undefined;
  if (!contact) throw new HttpError(410, 'This invitation is no longer valid.');
  const owner = (await db().doc(`users/${inv.ownerUid}`).get()).data() ?? {};
  return { ref, inv, contact, ownerName: (owner.name as string) || 'A Shevolution user' };
}

export async function describeInvite(token: string) {
  const { contact, ownerName } = await loadInvite(token);
  return { ownerName, contactName: contact.name, relationship: contact.relationship, phoneHint: mask(contact.phone, 3), emailHint: contact.email ? contact.email.replace(/^(.).*(@.*)$/, '$1•••$2') : null, verified: contact.verified };
}

/** A contact is verified only when their Firebase identity proves the exact phone number or email the owner entered. */
export async function acceptInvite(user: DecodedIdToken, token: string) {
  const { ref, inv, contact, ownerName } = await loadInvite(token);
  if (inv.ownerUid === user.uid) throw new HttpError(400, 'You cannot join your own Safety Circle.');
  const phoneOk = !!contact.phone && user.phone_number === contact.phone;
  const emailOk = !!contact.email && user.email_verified === true && user.email?.toLowerCase() === contact.email.toLowerCase();
  if (!phoneOk && !emailOk) throw new HttpError(403, 'Verify the phone number or email address this invitation was sent to.');
  await db().doc(`users/${inv.ownerUid}/contacts/${inv.contactId}`).update({ verified: true, linkedUid: user.uid, verifiedAt: nowIso(), verifiedBy: phoneOk ? 'phone' : 'email' });
  await db().doc(`users/${user.uid}/circles/${inv.ownerUid}`).set({ ownerUid: inv.ownerUid, ownerName, contactId: inv.contactId, since: nowIso() });
  await ref.update({ usedBy: user.uid });
  return { ownerName };
}

async function activeEvents(ownerUid: string) {
  return (await db().collection('sosEvents').where('ownerUid', '==', ownerUid).where('status', 'in', ['active', 'responding']).get()).docs;
}

export async function removeContact(ownerUid: string, contactId: string) {
  const ref = db().doc(`users/${ownerUid}/contacts/${contactId}`);
  const c = (await ref.get()).data() as EmergencyContact | undefined;
  if (!c) return;
  for (const e of await activeEvents(ownerUid)) {
    await closeAccess(e.id, contactId);
    if (c.linkedUid) await e.ref.update({ contactUids: FieldValue.arrayRemove(c.linkedUid) });
  }
  if (c.linkedUid) await db().doc(`users/${c.linkedUid}/circles/${ownerUid}`).delete();
  await ref.delete();
}

/** A contact asks "Are you safe?". Shown in the owner's app; texted too when a provider is configured. */
export async function requestCheckIn(contactUid: string, ownerUid: string) {
  const link = (await db().doc(`users/${contactUid}/circles/${ownerUid}`).get()).data();
  if (!link) throw new HttpError(403, 'You are not in this Safety Circle');
  const contact = (await db().doc(`users/${ownerUid}/contacts/${link.contactId}`).get()).data();
  if (!contact?.verified || contact.linkedUid !== contactUid) throw new HttpError(403, 'You are not in this Safety Circle');
  await db().collection(`users/${ownerUid}/checkinRequests`).add({ fromUid: contactUid, fromName: contact.name, contactId: link.contactId, at: nowIso(), answered: false });
  return { fromName: contact.name as string };
}
