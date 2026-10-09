/** Canonical RoadPulse data model — shared by vehicle detections and citizen reports. */

export type HazardSource = 'vehicle' | 'citizen';
export type Severity = 'low' | 'medium' | 'high' | 'unknown';

export type ReportStatus =
  | 'draft'
  | 'processing'
  | 'created'
  | 'submitted'
  | 'submission_failed'
  | 'pending_manual_submission'
  | 'under_review'
  | 'assigned'
  | 'resolved'
  | 'rejected';

/** Box in original-image pixel coordinates. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Detection {
  box: Box;
  confidence: number; // 0..1, from the model
}

export interface DetectionSummary {
  /** Best detection, if the model found one. */
  best: Detection | null;
  count: number;
  imageWidth: number;
  imageHeight: number;
  model: string;
}

export interface GeoFix {
  latitude: number;
  longitude: number;
  accuracy: number | null; // metres, as reported by the device
  timestamp: string; // ISO
  /** True when the user dragged the marker (or placed it on the map) instead of using GPS as-is. */
  adjusted: boolean;
}

export interface Address {
  road: string | null;
  locality: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  countryCode: string | null;
  postcode: string | null;
  displayName: string | null;
  provider: string;
}

export type SubmissionMethod = 'api' | 'email' | 'portal' | 'manual';

export interface RoadAuthority {
  id: string;
  name: string;
  jurisdiction: string; // human-readable, e.g. "Meerut Municipal Corporation area"
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  submissionMethod: SubmissionMethod;
  endpoint?: string; // API endpoint (api) or official portal URL (portal/manual)
  email?: string;
  apiAuthHeader?: string; // header name for the API key (value lives in a server secret)
  apiKeySecret?: string; // name of the env var holding the API key
  requiredFields?: string[];
  category?: string;
  slaText?: string; // only if officially published
  sourceUrl?: string; // where this contact/endpoint was verified
  enabled: boolean;
}

export interface TimelineEvent {
  key: 'photo' | 'detected' | 'manual_observation' | 'location' | 'created' | 'authority' | 'sent' | 'send_failed' | 'manual_pending' | 'manual_confirmed' | 'status';
  label: string;
  at: string;
}

export interface RoadHazard {
  id: string; // RP-2026-001842 (citizen) or VD-… (vehicle)
  mode: 'live'; // demo data is never stored
  source: HazardSource;
  type: 'pothole';

  imagePath: string | null; // original image in Storage (never overwritten)
  annotatedPath: string | null; // optional image with the detection box drawn

  latitude: number;
  longitude: number;
  geohash: string;
  locationAccuracy: number | null;
  locationAdjusted: boolean;

  confidence: number | null; // null for a manual observation
  box: Box | null;
  aiConfirmed: boolean; // false = user's own observation
  severity: Severity;
  severityEstimated: boolean;

  detectedAt: string;
  createdAt: string;
  updatedAt: string;

  address: Address | null;
  street: string | null;
  notes: string | null;

  authorityId: string | null;
  authorityName: string | null;
  authorityMethod: SubmissionMethod | null;
  authorityPortal: string | null;
  externalReportId: string | null;

  reportStatus: ReportStatus;
  statusNote: string | null;
  timeline: TimelineEvent[];

  groupId: string | null; // duplicate group (same road hazard)
  groupSize: number;

  ownerUid: string | null; // citizen (anonymous or signed-in) — never exposes a name
  deviceId: string | null; // vehicle
  trackId: string | null;
}

export interface Vehicle {
  id: string;
  name: string;
  keyHash: string;
  createdAt: string;
  lastSeenAt: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  detections: number;
  enabled: boolean;
}

export interface SubmissionResult {
  ok: boolean;
  status: Extract<ReportStatus, 'submitted' | 'submission_failed' | 'pending_manual_submission'>;
  method: SubmissionMethod;
  externalId?: string | null;
  httpStatus?: number | null;
  message: string;
  portalUrl?: string | null;
}
