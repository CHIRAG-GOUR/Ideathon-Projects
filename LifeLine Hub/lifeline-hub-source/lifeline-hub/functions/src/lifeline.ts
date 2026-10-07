// LifeLine Hub server routes: Health Vault responder access (temporary, scoped tokens with an access log) and
// LifeLine Helper pilot registration. Mounted on the shared Safety Core API.
import type { Request } from 'firebase-functions/https';
import { z } from 'zod';
import { db, nowIso, randomToken, sha256 } from '../../../safety-core/functions/src/admin';
import { HttpError, requireUser } from '../../../safety-core/functions/src/http';
import { deleteAccount } from '../../../safety-core/functions/src/account';

/** What a responder may be shown. Each token carries a subset chosen by the owner. */
export const SCOPES = ['bloodGroup', 'allergies', 'medications', 'conditions', 'emergencyNotes', 'emergencyContact', 'doctor'] as const;
type Scope = (typeof SCOPES)[number];

const tokenInput = z.object({
  scope: z.array(z.enum(SCOPES)).min(1).max(SCOPES.length),
  minutes: z.number().int().min(5).max(60),
  reason: z.enum(['manual', 'sos']).default('manual'),
});

/** POST /vault/token — the owner creates a temporary responder link. The raw token is returned once, never stored. */
async function createToken(req: Request) {
  const { uid } = await requireUser(req);
  const b = tokenInput.parse(req.body);
  const active = await db().collection(`users/${uid}/vaultTokens`).where('revoked', '==', false).where('expiresAt', '>', nowIso()).get();
  if (active.size >= 5) throw new HttpError(429, 'You already have 5 active responder links. Revoke one first.');
  const token = randomToken(24);
  const hash = sha256(token);
  const id = hash.slice(0, 20);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + b.minutes * 60_000).toISOString();
  const record = { scope: b.scope, createdAt, expiresAt, revoked: false, reason: b.reason, views: 0, lastViewedAt: null };
  await db().doc(`responderTokens/${hash}`).set({ ...record, ownerUid: uid, id });
  await db().doc(`users/${uid}/vaultTokens/${id}`).set(record);
  await log(uid, { kind: 'token_created', actor: 'You', detail: `Responder link created · ${b.minutes} min · ${b.scope.length} item${b.scope.length > 1 ? 's' : ''}`, tokenId: id });
  return { token, id, expiresAt };
}

/** POST /vault/token/revoke — ends a link immediately. */
async function revokeToken(req: Request) {
  const { uid } = await requireUser(req);
  const { id } = z.object({ id: z.string().regex(/^[a-f0-9]{20}$/) }).parse(req.body);
  const owned = await db().doc(`users/${uid}/vaultTokens/${id}`).get();
  if (!owned.exists) throw new HttpError(404, 'Link not found');
  const t = await db().collection('responderTokens').where('ownerUid', '==', uid).where('id', '==', id).limit(1).get();
  for (const d of t.docs) await d.ref.update({ revoked: true });
  await owned.ref.update({ revoked: true });
  await log(uid, { kind: 'token_revoked', actor: 'You', detail: 'Responder link revoked', tokenId: id });
}

/**
 * GET /responder?t=… — what an authorised responder sees after scanning the QR. Only the scoped fields of the
 * owner's medical profile, never the account, location history or other records. Every view is logged.
 */
async function responderView(req: Request) {
  const token = z.string().regex(/^[A-Za-z0-9_-]{24,64}$/).parse(req.query.t);
  const ref = db().doc(`responderTokens/${sha256(token)}`);
  const snap = await ref.get();
  const t = snap.data();
  if (!t) throw new HttpError(404, 'This link is not valid.');
  if (t.revoked) throw new HttpError(410, 'This link was revoked by its owner.');
  if (Date.parse(t.expiresAt) < Date.now()) throw new HttpError(410, 'This link has expired.');
  const uid = t.ownerUid as string;
  const [user, med] = await Promise.all([db().doc(`users/${uid}`).get(), db().doc(`users/${uid}/medicalProfile/main`).get()]);
  const m = (med.data() ?? {}) as Record<string, unknown>;
  const scope = new Set<Scope>(t.scope);
  const pick = <K extends Scope>(k: K, v: unknown) => (scope.has(k) ? v ?? null : undefined);
  const contact = (m.emergencyContact ?? null) as { name?: string; relationship?: string; phone?: string } | null;
  const at = nowIso();
  await ref.update({ views: (t.views ?? 0) + 1, lastViewedAt: at });
  await db().doc(`users/${uid}/vaultTokens/${t.id}`).update({ views: (t.views ?? 0) + 1, lastViewedAt: at }).catch(() => undefined);
  await log(uid, { kind: 'responder_view', actor: 'Responder (via your link)', detail: `Viewed ${[...scope].map(label).join(', ')}`, tokenId: t.id });
  return {
    firstName: String(user.get('name') ?? 'Patient').split(' ')[0],
    expiresAt: t.expiresAt,
    updatedAt: m.updatedAt ?? null,
    bloodGroup: pick('bloodGroup', m.bloodGroup),
    allergies: pick('allergies', m.allergies),
    medications: pick('medications', m.medications),
    conditions: pick('conditions', m.conditions),
    emergencyNotes: pick('emergencyNotes', m.emergencyNotes),
    emergencyContact: scope.has('emergencyContact') ? contact : undefined,
    doctor: pick('doctor', m.doctor),
  };
}

const label = (s: Scope) => ({ bloodGroup: 'blood group', allergies: 'allergies', medications: 'medications', conditions: 'conditions', emergencyNotes: 'emergency notes', emergencyContact: 'emergency contact', doctor: 'doctor' })[s];

async function log(uid: string, e: { kind: string; actor: string; detail: string; tokenId?: string }) {
  await db().collection(`users/${uid}/healthAccessLogs`).add({ ...e, at: nowIso() });
}

/** POST /helpers/register — pilot interest only. Nothing is public and nobody is "verified" by this step. */
async function registerHelper(req: Request) {
  const { uid } = await requireUser(req);
  const b = z.object({
    city: z.string().trim().min(2).max(60),
    skills: z.array(z.enum(['first_aid', 'cpr', 'medical_professional', 'driver', 'other'])).max(5),
    withdraw: z.boolean().optional(),
  }).parse(req.body);
  const ref = db().doc(`lifelineHelpers/${uid}`);
  if (b.withdraw) return void (await ref.delete());
  await ref.set({ city: b.city, skills: b.skills, status: 'pending_verification', updatedAt: nowIso() }, { merge: true });
}

/** POST /account/delete — Safety Core deletion plus LifeLine's top-level records. */
async function deleteEverything(req: Request) {
  const { uid } = await requireUser(req);
  const tokens = await db().collection('responderTokens').where('ownerUid', '==', uid).get();
  for (const d of tokens.docs) await d.ref.delete();
  await db().doc(`lifelineHelpers/${uid}`).delete().catch(() => undefined);
  await deleteAccount(uid);
}

export const lifelineRoutes = {
  'POST /vault/token': createToken,
  'POST /vault/token/revoke': revokeToken,
  'GET /responder': responderView,
  'POST /helpers/register': registerHelper,
  'POST /account/delete': deleteEverything,
};

/** Daily: remove expired responder tokens (their access logs stay with the owner). */
export async function purgeTokens() {
  const old = await db().collection('responderTokens').where('expiresAt', '<', new Date(Date.now() - 86_400_000).toISOString()).limit(400).get();
  for (const d of old.docs) await d.ref.delete();
}
