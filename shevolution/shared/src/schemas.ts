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

/** Random opaque IDs/tokens generated on the device (base64url, >= 128 bits). */
export const opaqueId = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/);
const sha256Hex = z.string().regex(/^[a-f0-9]{64}$/);

export const deliveryStatus = z.enum(['pending', 'submitted', 'delivered', 'failed', 'not_configured', 'not_permitted', 'skipped', 'queued']);

/** Everything the Android safety layer knows about one SOS, sent (and re-sent) until the server acknowledges it. */
export const sosSyncSchema = z.object({
  sosId: opaqueId,
  startedAt: iso,
  status: z.enum(['active', 'safe', 'cancelled']),
  endedAt: iso.nullable(),
  locations: z.array(locationSchema).max(500),
  shareTokens: z.array(z.object({ contactId: z.string().max(64), tokenHash: sha256Hex })).max(10),
  deviceSms: z.array(z.object({ contactId: z.string().max(64), status: deliveryStatus, at: iso.nullable(), via: z.enum(['device', 'composer']).nullable() })).max(10),
  battery: z.number().int().min(0).max(100).nullable(),
  network: z.enum(['online', 'weak', 'offline']).nullable(),
  region: z.string().length(2),
});
export type SosSync = z.infer<typeof sosSyncSchema>;

export const contactInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/).nullable(),
  email: z.string().email().max(120).nullable(),
  relationship: z.enum(['Mother', 'Father', 'Sibling', 'Partner', 'Friend', 'Roommate', 'Guardian', 'Other']),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  channels: z.object({ sms: z.boolean(), live: z.boolean(), call: z.boolean() }),
});

export const tripInputSchema = z.object({
  id: opaqueId,
  kind: z.enum(['trip', 'timer']),
  label: z.string().trim().min(1).max(80),
  pickup: z.object({ name: z.string().max(120), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).nullable().optional(),
  destination: z.object({ name: z.string().max(120), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).nullable(),
  route: z.array(z.tuple([z.number(), z.number()])).max(2500).optional(),
  minutes: z.number().int().min(5).max(24 * 60),
  autoEscalate: z.boolean(),
  contactIds: z.array(z.string().max(64)).max(10),
});

export const checkInSchema = z.object({
  message: z.string().trim().min(1).max(160),
  contactIds: z.array(z.string().max(64)).min(1).max(10),
  location: locationSchema.nullable(),
});
