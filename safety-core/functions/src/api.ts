import type { Request } from 'firebase-functions/https';
import { z } from 'zod';
import { checkPlanInput, locationSchema, opaqueId, sosSyncSchema } from '../../shared/src/schemas';
import { APP, db, nowIso } from './admin';
import { HttpError, requireDevice, requireOwner, requireUser, router } from './http';
import { liveMessage, liveRespond, liveSnapshot, ownerMessage, syncSos } from './sos';
import { deleteAccount, deleteHistory, registerDevice, removeContact } from './account';
import { confirmCheck, deviceCheckEvent, startChecks, stopChecks } from './checks';
import { mapProviderStatus, parseSmsConfig, validTwilioSignature, type SmsConfig } from './sms';

type Handler = (req: Request) => Promise<unknown>;

export interface CoreOptions {
  smsSecret: () => string | undefined;
  /** App history collections removed by "Delete history" (besides ended SOS events). */
  historyCollections: string[];
  /** Mount the periodic-check routes (She Shield, Fortiva). */
  checks?: boolean;
  extra?: Record<string, Handler>;
}

/** The shared Safety Core API; each app mounts it under its own Hosting rewrite and adds its own routes. */
export function createApi(o: CoreOptions) {
  const sms = (): SmsConfig | null => parseSmsConfig(o.smsSecret());
  const routes: Record<string, Handler> = {
    'GET /health': async () => ({ app: APP.id, time: nowIso() }),
    'POST /device/register': async (req) => registerDevice((await requireUser(req)).uid, z.object({ label: z.string().max(60) }).parse(req.body).label),
    // Phone (device key) or browser (signed-in user): the same idempotent SOS sync.
    'POST /sos/sync': async (req) => syncSos(await requireOwner(req), sosSyncSchema.parse(req.body), sms()),
    'POST /sos/message': async (req) => {
      const b = z.object({ sosId: opaqueId, text: z.string().trim().min(1).max(300) }).parse(req.body);
      await ownerMessage(await requireOwner(req), b.sosId, b.text);
    },
    // Contact live view: the link token is the authorisation (no account needed).
    'GET /live': async (req) => liveSnapshot(opaqueId.parse(req.query.t)),
    'POST /live/respond': async (req) => {
      const b = z.object({ token: opaqueId, responding: z.boolean(), location: locationSchema.nullable() }).parse(req.body);
      await liveRespond(b.token, b.responding, b.location);
    },
    'POST /live/message': async (req) => {
      const b = z.object({ token: opaqueId, text: z.string().trim().min(1).max(300) }).parse(req.body);
      await liveMessage(b.token, b.text);
    },
    'POST /contacts/remove': async (req) => removeContact(await requireOwner(req), z.object({ contactId: z.string().min(1).max(64) }).parse(req.body).contactId),
    'POST /history/delete': async (req) => deleteHistory((await requireUser(req)).uid, o.historyCollections),
    'POST /account/delete': async (req) => deleteAccount((await requireUser(req)).uid),
    'POST /sms/status': async (req) => {
      const cfg = sms();
      const params = req.body as Record<string, string>;
      if (!cfg || !validTwilioSignature(cfg.authToken, `${APP.origin}/api/sms/status`, params, req.get('x-twilio-signature') ?? '')) throw new HttpError(403, 'Bad signature');
      const status = mapProviderStatus(params.MessageStatus ?? '');
      const rec = (await db().collection('smsDeliveries').doc(params.MessageSid ?? '-').get()).data();
      if (status && rec) await db().doc(`sosEvents/${rec.sosId}`).update({ [`alerts.${rec.contactId}.sms.status`]: status, [`alerts.${rec.contactId}.sms.at`]: nowIso() });
    },
    ...o.extra,
  };
  if (o.checks) {
    Object.assign(routes, {
      'POST /checks/start': async (req: Request) => {
        const b = z.object({ plan: checkPlanInput, location: locationSchema.nullable() }).parse(req.body);
        return startChecks(await requireOwner(req), b.plan, b.location);
      },
      'POST /checks/confirm': async (req: Request) => {
        const b = z.object({ location: locationSchema.nullable(), at: z.string().datetime().optional() }).parse(req.body);
        return confirmCheck(await requireOwner(req), b.location, b.at);
      },
      'POST /checks/stop': async (req: Request) => stopChecks(await requireOwner(req)),
      'POST /checks/event': async (req: Request) => {
        const b = z.object({ type: z.enum(['warning', 'missed', 'escalated', 'sos']), at: z.string().datetime(), location: locationSchema.nullable() }).parse(req.body);
        await deviceCheckEvent((await requireDevice(req)).uid, b.type, b.at, b.location);
      },
    });
  }
  return { handler: router(routes), sms };
}
