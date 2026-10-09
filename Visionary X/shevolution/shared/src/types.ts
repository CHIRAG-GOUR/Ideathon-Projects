// Shared data model for the Android safety layer, the web app and Cloud Functions.
// Times are ISO-8601 strings; coordinates are WGS84 degrees; accuracy is metres (68% radius).

/** sms: SOS text (also rings the Shevolution app if the contact has it). live: live-location link. call: auto-call. */
export type Channel = 'sms' | 'live' | 'call';

export interface EmergencyLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null; // m/s
  heading: number | null; // degrees
  timestamp: string;
  provider?: string; // gps | network | fused | passive
  lastKnown?: boolean; // true when this is an older cached fix, never shown as "current"
}

export interface EmergencyProfile {
  age?: number | null;
  bloodGroup?: string | null;
  allergies?: string | null;
  medicalNotes?: string | null;
  /** Medical fields are only attached to an SOS when this is on. */
  shareMedical: boolean;
}

export interface UserSettings {
  sound: boolean;
  vibration: boolean;
  /** Number called automatically after activation (never an emergency number: Android only allows dialing those). */
  autoCallContactId: string | null;
  /** Minutes without a responder before the circle gets one escalation alert (0 = never). */
  escalateAfterMin: number;
  retentionDays: number;
  trackingIntervalSec: number;
  region: string; // ISO country code, e.g. "IN"
  discreet: boolean;
  /** Mute the siren temporarily (e.g. while testing in an office). Sound setting is preserved. */
  silenceSiren: boolean;
}

export interface User {
  uid: string;
  name: string;
  phone: string | null;
  email: string | null;
  profile: EmergencyProfile;
  settings: UserSettings;
  createdAt: string;
}

export type Relationship = 'Mother' | 'Father' | 'Sibling' | 'Partner' | 'Friend' | 'Roommate' | 'Guardian' | 'Other';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string | null; // E.164
  email: string | null;
  relationship: Relationship;
  priority: 1 | 2 | 3; // primary, secondary, backup
  channels: Record<Channel, boolean>;
  /** Set only by the server after the contact proved they own the phone/email. */
  verified: boolean;
  linkedUid: string | null;
  createdAt: string;
}

export type SosStatus = 'active' | 'responding' | 'safe' | 'cancelled';

/** What actually happened on each channel. "submitted" never means "delivered". */
export type DeliveryStatus =
  | 'pending'
  | 'submitted' // handed to the carrier / provider / push service
  | 'delivered' // provider or carrier confirmed delivery
  | 'failed'
  | 'not_configured'
  | 'not_permitted'
  | 'skipped'
  | 'queued'; // waiting for network

export interface SmsDelivery {
  status: DeliveryStatus;
  via: 'device' | 'provider' | 'composer' | null;
  at: string | null;
  error?: string | null;
}

export interface ContactAlert {
  contactId: string;
  name: string;
  relationship: Relationship;
  priority: number;
  sms: SmsDelivery;
  live: 'shared' | 'not_verified' | 'off';
}

export interface SosEvent {
  id: string;
  ownerUid: string;
  ownerName: string;
  ownerPhone: string | null;
  status: SosStatus;
  startedAt: string;
  endedAt: string | null;
  lastLocation: EmergencyLocation | null;
  contactIds: string[];
  contactUids: string[]; // verified, linked contacts allowed to read while active
  alerts: Record<string, ContactAlert>;
  profile: Partial<EmergencyProfile> | null;
  battery: number | null;
  network: string | null;
  escalatedAt: string | null;
  responderCount: number;
  region: string;
}

export interface Responder {
  uid: string;
  name: string;
  relationship: string | null;
  responding: boolean;
  shareLocation: boolean;
  location: EmergencyLocation | null;
  at: string;
}

export interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  text: string;
  at: string;
}

export type TripKind = 'trip' | 'timer';
export type TripStatus = 'active' | 'arrived' | 'checked_in' | 'overdue' | 'escalated' | 'cancelled';

export interface SafetyTrip {
  id: string;
  kind: TripKind;
  label: string;
  pickup?: { name: string; latitude: number; longitude: number } | null;
  destination: { name: string; latitude: number; longitude: number } | null;
  route?: [number, number][] | null;
  startedAt: string;
  dueAt: string;
  status: TripStatus;
  autoEscalate: boolean;
  contactIds: string[];
  lastLocation: EmergencyLocation | null;
  overdueAt: string | null;
  endedAt: string | null;
}

export interface CheckIn {
  id: string;
  message: string;
  location: EmergencyLocation | null;
  contactIds: string[];
  at: string;
  results: Record<string, DeliveryStatus>;
}

