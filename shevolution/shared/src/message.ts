import type { EmergencyLocation } from './types';
import { fmtAccuracy, fmtCoord, mapsLink } from './geo';

export const APP_ORIGIN = 'https://shevolution-ideathon.web.app';
export const trackingUrl = (token: string, origin = APP_ORIGIN) => `${origin}/e/${token}`;

/**
 * SMS templates. The Android layer fills the same {placeholders} with plain string replacement when it
 * sends from the device (offline too), so the server and the phone always produce the same text.
 * Plain ASCII keeps each part at 160 characters (an emoji would switch the whole SMS to 70-char parts).
 */
export const SMS_TEMPLATES = {
  sos: 'SOS ALERT\n{name} may be in danger and needs help.\n{locline}\n{coords}\nTime: {time}\n{live}Please call {name} and call {emergency} if needed.\n- Shevolution',
  update: '{name} (Shevolution SOS) {status}.\nTime: {time}',
  escalation: 'SOS STILL ACTIVE\n{name} has not had a response yet.\n{locline}\n{coords}\n{live}Please call {name} or {emergency}.\n- Shevolution',
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
}

export function fillSms(template: string, f: SmsFields): string {
  const loc = f.location;
  const locline = loc ? `${loc.lastKnown ? 'Last known location' : 'Location'}: ${mapsLink(loc.latitude, loc.longitude)}\n` : 'Location: not available yet\n';
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
  };
  return template
    .replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function fmtTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-IN', { timeZone, hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', hour12: true, timeZoneName: 'short' }).format(new Date(iso));
}
