import type { EmergencyLocation } from './types';
import { fmtAccuracy, fmtCoord, mapsLink } from './geo';

export const APP_ORIGIN = 'https://shevolution-ideathon.web.app';
export const trackingUrl = (token: string, origin = APP_ORIGIN) => `${origin}/e/${token}`;

/**
 * Message templates (SMS, WhatsApp, email). The Android layer fills the same {placeholders} when it sends
 * from the phone (offline too), so every channel says the same thing.
 */
export const SMS_TEMPLATES = {
  sos: '🆘 SOS! I NEED HELP!\n{name} is in DANGER and needs help NOW.\n{locline}\n{coords}\n{area}\n🕒 Time: {time}\n{live}📞 Call me NOW. If I don\'t answer, call {emergency} and come to this location.\n- Shevolution SOS',
  update: '{name} (Shevolution SOS) {status}.\nTime: {time}',
  escalation: '🆘 SOS STILL ACTIVE!\n{name} has had NO response yet.\n{locline}\n{coords}\n{area}\n{live}Please call {name} NOW or call {emergency}.\n- Shevolution SOS',
  checkin: '{name}: {message}\n{locline}\nTime: {time}\n- Shevolution check-in',
  trip: 'SAFE TRIP OVERDUE\n{name} started "{label}" and has not checked in (due {due}).\n{locline}\n{coords}\nPlease call {name}.\n- Shevolution',
} as const;

export interface SmsFields {
  name: string;
  location: EmergencyLocation | null;
  time: string; // already formatted in the sender's time zone
  emergency: string;
  liveUrl?: string | null;
  status?: string;
  message?: string;
  label?: string;
  due?: string;
  area?: string | null; // approximate address, when reverse geocoding succeeded
}

export function fillSms(template: string, f: SmsFields): string {
  const loc = f.location;
  const locline = loc ? `📍 ${loc.lastKnown ? 'Last known location' : 'Location'}: ${mapsLink(loc.latitude, loc.longitude)}\n` : '📍 Location: not available yet\n';
  const coords = loc ? `Lat ${fmtCoord(loc.latitude)} Lng ${fmtCoord(loc.longitude)} (${fmtAccuracy(loc.accuracy)})` : '';
  const vars: Record<string, string> = {
    name: f.name,
    locline: locline.trimEnd(),
    coords,
    time: f.time,
    emergency: f.emergency,
    live: f.liveUrl ? `Live location: ${f.liveUrl}\n` : '',
    status: f.status ?? '',
    message: f.message ?? '',
    label: f.label ?? '',
    due: f.due ?? '',
    area: f.area ? `🏠 Area (approx.): ${f.area}` : '',
  };
  return template
    .replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function fmtTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-IN', { timeZone, hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', hour12: true, timeZoneName: 'short' }).format(new Date(iso));
}
