import type { EmergencyLocation } from './types';
import { fmtAccuracy, fmtCoord, mapsLink } from './geo';

/**
 * Message templates for SMS, WhatsApp and email. {brand} is the app name. The Android layer fills the same
 * placeholders when it sends from the phone (offline too), so every channel says the same thing.
 * The live link is an opaque, expiring token — never coordinates or names in the URL.
 */
export const TEMPLATES = {
  sos: '🆘 SOS! I NEED HELP!\n{name} is in DANGER and needs help NOW.\n{locline}\n{coords}\n{area}\n🕒 Time: {time}\n{live}📞 Call me NOW. If I don\'t answer, call {emergency} and come to this location.\n- {brand} SOS',
  discreet: '🆘 SILENT ALERT from {name}. I may not be able to talk.\n{locline}\n{coords}\n{area}\n🕒 Time: {time}\n{live}Please check on me quietly. If you can\'t reach me, call {emergency}.\n- {brand} SOS',
  check: '⚠️ MISSED SAFETY CHECK\n{name} did not answer "{label}" (due {due}).\n{locline}\n{coords}\n{area}\n{live}Please call {name} now. If you can\'t reach them, call {emergency}.\n- {brand} SOS',
  escalation: '🆘 SOS STILL ACTIVE!\n{name} has had NO response yet.\n{locline}\n{coords}\n{area}\n{live}Please call {name} NOW or call {emergency}.\n- {brand} SOS',
  update: '{name} ({brand} SOS) {status}.\nTime: {time}',
} as const;
export type TemplateKey = keyof typeof TEMPLATES;

export interface MessageFields {
  brand: string;
  name: string;
  location: EmergencyLocation | null;
  time: string; // already formatted in the sender's time zone
  emergency: string;
  liveUrl?: string | null;
  area?: string | null;
  status?: string;
  label?: string;
  due?: string;
}

export function fillMessage(template: string, f: MessageFields): string {
  const loc = f.location;
  const vars: Record<string, string> = {
    brand: f.brand,
    name: f.name,
    locline: loc ? `📍 ${loc.lastKnown ? 'Last known location' : 'Location'}: ${mapsLink(loc.latitude, loc.longitude)}` : '📍 Location: not available yet',
    coords: loc ? `Lat ${fmtCoord(loc.latitude)} Lng ${fmtCoord(loc.longitude)} (${fmtAccuracy(loc.accuracy)})` : '',
    area: f.area ? `🏠 Area (approx.): ${f.area}` : '',
    time: f.time,
    emergency: f.emergency,
    live: f.liveUrl ? `🔴 Live location: ${f.liveUrl}\n` : '',
    status: f.status ?? '',
    label: f.label ?? '',
    due: f.due ?? '',
  };
  return template
    .replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export const liveUrl = (origin: string, token: string) => `${origin}/live/${token}`;

export function fmtTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-IN', { timeZone, hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short', hour12: true, timeZoneName: 'short' }).format(new Date(iso));
}
