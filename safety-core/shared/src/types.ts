// Safety Core data model — shared by the Android safety layer, the web apps and Cloud Functions of
// She Shield, Fortiva and Safety Warriors. Each app stores this in its OWN Firebase project/database.
// Times are ISO-8601 strings; coordinates are WGS84 degrees; accuracy is metres.

export interface EmergencyLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null; // m/s
  heading: number | null; // degrees
  timestamp: string;
  provider?: string; // gps | network | fused | passive | browser
  lastKnown?: boolean; // an older cached fix — never shown as "current"
}

export interface EmergencyProfile {
  bloodGroup?: string | null;
  allergies?: string | null;
  medicalNotes?: string | null;
  /** Medical fields are attached to an SOS only when this is on. */
  shareMedical: boolean;
}

export interface UserSettings {
  sound: boolean;
  vibration: boolean;
  /** Minutes without a responder before one escalation text goes out (0 = never). */
  escalateAfterMin: number;
  retentionDays: number;
  trackingIntervalSec: number;
  region: string; // ISO country code, e.g. "IN"
  /** She Shield: pressing volume-down 4 times while the app is open starts a Discreet Alert. */
  volumeTrigger?: boolean;
}

export interface User {
  name: string;
  phone: string | null;
  email: string | null;
  profile: EmergencyProfile;
  settings: UserSettings;
  createdAt: string;
}

/** Fortiva's Trusted Circle roles; the other apps show them as labels. */
export type ContactRole = 'primary' | 'family' | 'friend' | 'emergency';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string | null; // E.164
  email: string | null;
  role: ContactRole;
  relationship: string;
  /** sms: automatic text from the user's SIM; whatsapp/email: opened ready to send; live: personal live-location link. */
  channels: { sms: boolean; whatsapp: boolean; email: boolean; live: boolean };
  createdAt: string;
}

export type SosStatus = 'active' | 'responding' | 'safe' | 'cancelled';

/** What actually happened on a channel. "submitted" never means "delivered". */
export type DeliveryStatus = 'pending' | 'submitted' | 'delivered' | 'failed' | 'not_configured' | 'not_permitted' | 'skipped' | 'queued';

export interface SmsDelivery {
  status: DeliveryStatus;
  via: 'device' | 'provider' | 'composer' | null;
  at: string | null;
  error?: string | null;
}

export interface ContactAlert {
  contactId: string;
  name: string;
  role: ContactRole;
  sms: SmsDelivery;
  live: 'shared' | 'off';
}

export interface SosEvent {
  id: string;
  ownerUid: string;
  ownerName: string;
  ownerPhone: string | null;
  status: SosStatus;
  /** How it started: the big SOS button, a discreet alert, or a missed safety check. */
  trigger: 'sos' | 'discreet' | 'check';
  startedAt: string;
  endedAt: string | null;
  lastLocation: EmergencyLocation | null;
  area: string | null;
  alerts: Record<string, ContactAlert>;
  profile: Partial<EmergencyProfile> | null;
  battery: number | null;
  network: string | null;
  responderCount: number;
  region: string;
  source: 'android' | 'web';
}

export interface Responder {
  id: string;
  name: string;
  responding: boolean;
  location: EmergencyLocation | null;
  at: string;
}

export interface ChatMessage {
  id: string;
  from: 'owner' | 'contact';
  name: string;
  text: string;
  at: string;
}

/** What a contact's live-location page receives (through the token, never via the database directly). */
export interface LiveSnapshot {
  ownerName: string;
  ownerPhone: string | null;
  status: SosStatus;
  trigger: SosEvent['trigger'];
  startedAt: string;
  endedAt: string | null;
  lastLocation: EmergencyLocation | null;
  area: string | null;
  trail: EmergencyLocation[];
  responders: Responder[];
  messages: ChatMessage[];
  battery: number | null;
  network: string | null;
  region: string;
  you: { contactId: string; name: string; responding: boolean };
  profile: Partial<EmergencyProfile> | null;
}

// ---- Periodic safety checks (She Shield "Protection Check", Fortiva "Safety Check Network") ----

/**
 * WAITING → DUE (asked "Are you safe?") → WARNING (asked again, louder) → ESCALATED (policy runs).
 * A confirmation in DUE/WARNING returns to WAITING; OFF when stopped.
 */
export type CheckState = 'OFF' | 'WAITING' | 'DUE' | 'WARNING' | 'ESCALATED';
export type EscalationPolicy = 'notify' | 'sos';

export interface CheckPlan {
  active: boolean;
  label: string;
  intervalMin: number;
  /** Minutes to answer before the warning, and again before escalation. */
  graceMin: number;
  policy: EscalationPolicy;
  contactIds: string[];
  startedAt: string | null;
  nextDueAt: string | null;
  lastConfirmedAt: string | null;
  escalatedAt: string | null;
  escalatedBy: 'device' | 'server' | null;
  updatedAt: string;
}

export interface CheckLogEntry {
  id: string;
  type: 'started' | 'confirmed' | 'warning' | 'missed' | 'escalated' | 'stopped' | 'sos';
  at: string;
  note?: string | null;
  location?: EmergencyLocation | null;
}
