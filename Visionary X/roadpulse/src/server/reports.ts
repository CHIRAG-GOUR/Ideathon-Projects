import 'server-only';
import { geohashForLocation } from 'geofire-common';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { bucket, firestore } from './admin';
import { HttpError } from './auth';
import { nextId } from './ids';
import { findGroup, joinGroup } from './duplicates';
import { reverseGeocode } from './geocode';
import { listAuthorities, getAuthority } from './authority/directory';
import { matchAuthority } from './authority/router';
import { EmailAuthorityAdapter } from './authority/adapters/email';
import { ApiAuthorityAdapter } from './authority/adapters/api';
import { PortalAuthorityAdapter } from './authority/adapters/portal';
import type { AuthorityAdapter } from './authority/adapters/types';
import { confidenceBand, estimateSeverity } from '@/lib/detection/decode';
import type { RoadAuthority, RoadHazard, SubmissionResult, TimelineEvent, Vehicle } from '@/types';

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://roadpulse-ideathon.web.app';

const box = z.object({ x: z.number().min(0), y: z.number().min(0), w: z.number().positive(), h: z.number().positive() });
const coords = {
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000).nullable(),
};

export const citizenReportSchema = z.object({
  imagePath: z.string().regex(/^citizen\/[A-Za-z0-9_-]{6,128}\/[A-Za-z0-9_-]{6,80}\.jpg$/),
  annotatedPath: z.string().regex(/^citizen\/[A-Za-z0-9_-]{6,128}\/[A-Za-z0-9_-]{6,80}\.jpg$/).nullable(),
  detection: z.object({
    confidence: z.number().min(0).max(1).nullable(),
    box: box.nullable(),
    imageWidth: z.number().int().min(16).max(10000),
    imageHeight: z.number().int().min(16).max(10000),
    userConfirmed: z.literal(true), // "Does this look correct?" → Yes
  }),
  location: z.object({ ...coords, timestamp: z.string().datetime(), adjusted: z.boolean() }),
  street: z.string().trim().max(120).nullable(),
  notes: z.string().trim().max(500).nullable(),
});
export type CitizenReportInput = z.infer<typeof citizenReportSchema>;

export const vehicleEventSchema = z.object({
  trackId: z.string().max(40),
  confidence: z.number().min(0).max(1),
  box,
  imageWidth: z.number().int().min(16).max(10000),
  imageHeight: z.number().int().min(16).max(10000),
  ...coords,
  detectedAt: z.string().datetime(),
  imageJpegBase64: z.string().max(1_400_000).nullable(),
});

const ev = (key: TimelineEvent['key'], label: string, at = new Date().toISOString()): TimelineEvent => ({ key, label, at });

function adapterFor(a: RoadAuthority): AuthorityAdapter {
  return a.submissionMethod === 'email' ? EmailAuthorityAdapter : a.submissionMethod === 'api' ? ApiAuthorityAdapter : PortalAuthorityAdapter;
}

/** Where would a report at these coordinates go? (Shown to the citizen before they submit.) */
export async function previewRouting(lat: number, lon: number) {
  const address = await reverseGeocode(lat, lon);
  const authority = matchAuthority(address, await listAuthorities());
  return {
    address,
    authority: authority && { id: authority.id, name: authority.name, jurisdiction: authority.jurisdiction, method: authority.submissionMethod, portal: authority.endpoint ?? null },
  };
}

export async function createCitizenReport(uid: string, input: CitizenReportInput): Promise<RoadHazard> {
  const now = new Date();
  // 1. Image: must be this user's upload, present in our bucket, a real JPEG of sensible size.
  if (!input.imagePath.startsWith(`citizen/${uid}/`) || (input.annotatedPath && !input.annotatedPath.startsWith(`citizen/${uid}/`))) throw new HttpError(403, 'That photo doesn’t belong to you.');
  const [meta] = await bucket().file(input.imagePath).getMetadata().catch(() => [null]);
  if (!meta) throw new HttpError(400, 'The photo hasn’t finished uploading. Please try again.');
  if (Number(meta.size) < 5_000 || Number(meta.size) > 8 * 1024 * 1024 || meta.contentType !== 'image/jpeg') throw new HttpError(400, 'The photo couldn’t be used.');
  // 2. Detection: an AI-confirmed report needs a medium-or-better detection inside the image.
  const d = input.detection;
  const aiConfirmed = d.confidence != null && d.box != null && confidenceBand(d.confidence) !== 'low';
  if (d.box && (d.box.x + d.box.w > d.imageWidth + 1 || d.box.y + d.box.h > d.imageHeight + 1)) throw new HttpError(400, 'Detection box is outside the image.');
  // 3. Coordinates: real device/map values, not in the future, not stale.
  const fixAge = now.getTime() - Date.parse(input.location.timestamp);
  if (fixAge < -120_000 || fixAge > 6 * 3600_000) throw new HttpError(400, 'Location is out of date. Please capture it again.');
  const { latitude, longitude } = input.location;

  const id = await nextId('RP', now);
  const timeline: TimelineEvent[] = [ev('photo', 'Photo received')];
  timeline.push(aiConfirmed ? ev('detected', `Pothole detected (${Math.round(d.confidence! * 100)}% confidence)`) : ev('manual_observation', 'Reported as your own observation (not AI-confirmed)'));
  timeline.push(ev('location', input.location.adjusted ? 'Location set on the map by you' : `Location captured (±${Math.round(input.location.accuracy ?? 0)} m)`));

  // 4–5. Jurisdiction + authority.
  const address = await reverseGeocode(latitude, longitude);
  const authority = matchAuthority(address, await listAuthorities());
  const group = await findGroup(latitude, longitude, now);

  const hazard: RoadHazard = {
    id,
    mode: 'live',
    source: 'citizen',
    type: 'pothole',
    imagePath: input.imagePath,
    annotatedPath: input.annotatedPath,
    latitude,
    longitude,
    geohash: geohashForLocation([latitude, longitude]),
    locationAccuracy: input.location.accuracy,
    locationAdjusted: input.location.adjusted,
    confidence: aiConfirmed ? d.confidence : null,
    box: aiConfirmed ? d.box : null,
    aiConfirmed,
    severity: aiConfirmed ? estimateSeverity(d.box, d.imageWidth, d.imageHeight, d.confidence) : 'unknown',
    severityEstimated: aiConfirmed,
    detectedAt: input.location.timestamp,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    address,
    street: input.street || null,
    notes: input.notes || null,
    authorityId: authority?.id ?? null,
    authorityName: authority?.name ?? null,
    authorityMethod: authority?.submissionMethod ?? null,
    authorityPortal: authority?.endpoint ?? null,
    externalReportId: null,
    reportStatus: 'created',
    statusNote: authority ? null : 'Authority submission is not currently connected for this area.',
    timeline: [...timeline, ev('created', 'Report created')],
    groupId: null,
    groupSize: 1,
    ownerUid: uid,
    deviceId: null,
    trackId: null,
  };
  // 6. Store the report first — an external failure must never lose it.
  await firestore().collection('roadHazards').doc(id).set(hazard);
  if (group) {
    const size = await joinGroup(group.groupId, group.anchorId, id, latitude, longitude, 'citizen');
    hazard.groupId = group.groupId;
    hazard.groupSize = size;
    await firestore().collection('roadHazards').doc(id).update({ groupId: group.groupId, groupSize: size });
  }
  // 7–9. Submit through the configured integration and store the real outcome.
  if (authority) return submitToAuthority(hazard, authority);
  return hazard;
}

export async function submitToAuthority(hazard: RoadHazard, authority: RoadAuthority): Promise<RoadHazard> {
  const image = hazard.imagePath ? await bucket().file(hazard.imagePath).download().then(([b]) => b).catch(() => null) : null;
  let result: SubmissionResult;
  try {
    result = await adapterFor(authority).submitReport(hazard, authority, { image, appUrl: APP_URL });
  } catch (err) {
    result = { ok: false, status: 'submission_failed', method: authority.submissionMethod, message: `Submission error: ${(err as Error).message.slice(0, 120)}` };
  }
  const at = new Date().toISOString();
  await firestore().collection('authoritySubmissions').add({
    hazardId: hazard.id,
    authorityId: authority.id,
    authorityName: authority.name,
    method: result.method,
    status: result.status,
    ok: result.ok,
    httpStatus: result.httpStatus ?? null,
    externalId: result.externalId ?? null,
    message: result.message,
    at,
  });
  const timeline = [...hazard.timeline, ev('authority', `Routed to ${authority.name}`, at)];
  if (result.status === 'submitted') timeline.push(ev('sent', `Sent to ${authority.name}`, at));
  else if (result.status === 'submission_failed') timeline.push(ev('send_failed', `Couldn’t send to ${authority.name}: ${result.message}`, at));
  else timeline.push(ev('manual_pending', 'Waiting for you to submit on the official channel', at));
  const patch: Partial<RoadHazard> = {
    reportStatus: result.status,
    statusNote: result.message,
    externalReportId: result.externalId ?? null,
    authorityPortal: result.portalUrl ?? authority.endpoint ?? null,
    timeline,
    updatedAt: at,
  };
  await firestore().collection('roadHazards').doc(hazard.id).update(patch);
  return { ...hazard, ...patch };
}

export async function retrySubmission(hazard: RoadHazard): Promise<RoadHazard> {
  if (hazard.reportStatus !== 'submission_failed' || !hazard.authorityId) throw new HttpError(409, 'This report isn’t waiting for a retry.');
  const authority = await getAuthority(hazard.authorityId);
  if (!authority || !authority.enabled) throw new HttpError(409, 'That authority is no longer configured.');
  return submitToAuthority(hazard, authority);
}

/** Vehicle / edge-device event → the same canonical hazard. Stored as "Report Created" for the dashboard. */
export async function createVehicleEvent(vehicle: Vehicle, input: z.infer<typeof vehicleEventSchema>): Promise<RoadHazard> {
  const now = new Date();
  const id = await nextId('VD', now);
  let imagePath: string | null = null;
  if (input.imageJpegBase64) {
    const buf = Buffer.from(input.imageJpegBase64, 'base64');
    if (buf.length > 1000 && buf[0] === 0xff && buf[1] === 0xd8) {
      imagePath = `vehicle/${vehicle.id}/${id}.jpg`;
      await bucket().file(imagePath).save(buf, { contentType: 'image/jpeg', resumable: false });
    }
  }
  const address = await reverseGeocode(input.latitude, input.longitude);
  const group = await findGroup(input.latitude, input.longitude, now);
  const hazard: RoadHazard = {
    id,
    mode: 'live',
    source: 'vehicle',
    type: 'pothole',
    imagePath,
    annotatedPath: null,
    latitude: input.latitude,
    longitude: input.longitude,
    geohash: geohashForLocation([input.latitude, input.longitude]),
    locationAccuracy: input.accuracy,
    locationAdjusted: false,
    confidence: input.confidence,
    box: input.box,
    aiConfirmed: true,
    severity: estimateSeverity(input.box, input.imageWidth, input.imageHeight, input.confidence),
    severityEstimated: true,
    detectedAt: input.detectedAt,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    address,
    street: null,
    notes: null,
    authorityId: null,
    authorityName: null,
    authorityMethod: null,
    authorityPortal: null,
    externalReportId: null,
    reportStatus: 'created',
    statusNote: null,
    timeline: [
      ev('detected', `Pothole detected by ${vehicle.name} (${Math.round(input.confidence * 100)}%)`, input.detectedAt),
      ev('location', `GPS attached (±${Math.round(input.accuracy ?? 0)} m)`, input.detectedAt),
      ev('created', 'Event recorded'),
    ],
    groupId: null,
    groupSize: 1,
    ownerUid: null,
    deviceId: vehicle.id,
    trackId: input.trackId,
  };
  const db = firestore();
  await db.collection('roadHazards').doc(id).set(hazard);
  if (group) {
    const size = await joinGroup(group.groupId, group.anchorId, id, input.latitude, input.longitude, 'vehicle');
    await db.collection('roadHazards').doc(id).update({ groupId: group.groupId, groupSize: size });
    hazard.groupId = group.groupId;
    hazard.groupSize = size;
  }
  await db.collection('vehicles').doc(vehicle.id).update({
    lastSeenAt: now.toISOString(),
    lastLatitude: input.latitude,
    lastLongitude: input.longitude,
    detections: FieldValue.increment(1),
  });
  return hazard;
}
