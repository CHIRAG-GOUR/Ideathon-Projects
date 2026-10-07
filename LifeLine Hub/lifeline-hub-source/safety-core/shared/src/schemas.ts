import { z } from 'zod';

const iso = z.string().datetime({ offset: true });

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100_000).nullable(),
  altitude: z.number().min(-1000).max(20_000).nullable(),
  speed: z.number().min(0).max(150).nullable(),
  heading: z.number().min(0).max(360).nullable(),
  timestamp: iso,
  provider: z.string().max(16).optional(),
  lastKnown: z.boolean().optional(),
});

/** Random opaque IDs/tokens generated on the device or browser (base64url, ≥128 bits). Also the idempotency key. */
export const opaqueId = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/);
const sha256Hex = z.string().regex(/^[a-f0-9]{64}$/);
export const deliveryStatus = z.enum(['pending', 'submitted', 'delivered', 'failed', 'not_configured', 'not_permitted', 'skipped', 'queued']);

/** The whole SOS as the phone/browser knows it; re-sent until acknowledged (idempotent on sosId). */
export const sosSyncSchema = z.object({
  sosId: opaqueId,
  trigger: z.enum(['sos', 'discreet', 'check']).default('sos'),
  startedAt: iso,
  status: z.enum(['active', 'safe', 'cancelled']),
  endedAt: iso.nullable(),
  locations: z.array(locationSchema).max(500),
  area: z.string().max(200).nullable().default(null),
  shareTokens: z.array(z.object({ contactId: z.string().max(64), tokenHash: sha256Hex })).max(10),
  deviceSms: z.array(z.object({ contactId: z.string().max(64), status: deliveryStatus, at: iso.nullable(), via: z.enum(['device', 'composer']).nullable() })).max(10),
  battery: z.number().int().min(0).max(100).nullable(),
  network: z.enum(['online', 'weak', 'offline']).nullable(),
  region: z.string().length(2),
  source: z.enum(['android', 'web']).default('android'),
});
export type SosSync = z.infer<typeof sosSyncSchema>;

export const contactInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/).nullable(),
  email: z.string().email().max(120).nullable(),
  role: z.enum(['primary', 'family', 'friend', 'emergency']),
  relationship: z.string().trim().max(30),
  channels: z.object({ sms: z.boolean(), whatsapp: z.boolean(), email: z.boolean(), live: z.boolean() }),
});

export const checkPlanInput = z.object({
  label: z.string().trim().min(1).max(60),
  intervalMin: z.number().int().min(5).max(24 * 60),
  graceMin: z.number().int().min(1).max(60),
  policy: z.enum(['notify', 'sos']),
  contactIds: z.array(z.string().max(64)).max(10),
});
