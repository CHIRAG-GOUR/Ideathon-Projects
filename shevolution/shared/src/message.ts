import type { EmergencyLocation } from './types';
import { fmtAccuracy, fmtCoord, mapsLink } from './geo';

export const APP_ORIGIN = 'https://shevolution-ideathon.web.app';
export const trackingUrl = (
  token: string,
  origin = APP_ORIGIN,
  loc?: { latitude: number; longitude: number } | null,
  name?: string
) => {
  if (loc && (loc.latitude !== 0 || loc.longitude !== 0)) {
    const id = encodeURIComponent(token.slice(0, 10));
    const p = `${loc.latitude.toFixed(5)},${loc.longitude.toFixed(5)}`;
    const n = name ? `&n=${encodeURIComponent(name)}` : '';
    return `${origin}/trip?id=${id}&p=${p}${n}&sos=1`;
  }
  return `${origin}/trip?id=${encodeURIComponent(token)}&sos=1`;
};

/**
 * Message templates (SMS, WhatsApp, email). The Android layer fills the same {placeholders} when it sends
 * from the phone (offline too), so every channel says the same thing.
 */
export const SMS_TEMPLATES = {
  sos: '🆘 SOS! I NEED HELP NOW!\n{name} is in DANGER and needs IMMEDIATE HELP.\n\n{locline}\n{coords}\n{area}\n{live}🕒 Time: {time}\n📞 Call me NOW. If I don\'t answer, call emergency {emergency}.\n- Shevolution SOS',
  update: '✅ {name} (Shevolution) {status}.\n\n{locline}\n{coords}\n🕒 Time: {time}',
  escalation: '🆘 SOS STILL ACTIVE!\n{name} has had NO response yet.\n\n{locline}\n{coords}\n{area}\n{live}Please call {name} NOW or call emergency {emergency}.\n- Shevolution SOS',
  checkin: '👋 Check-in from {name}: "{message}"\n\n{locline}\n{coords}\n{area}\n🕒 Time: {time}\n- Shevolution Check-in',
  trip: '🛡️ SAFE RIDE OVERDUE\n{name} started "{label}" and has not checked in (due {due}).\n\n{locline}\n{coords}\n{area}\n{live}Please call {name}.\n- Shevolution',
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
  const locline = loc ? `🗺️ Google Maps Location: https://maps.google.com/?q=${fmtCoord(loc.latitude)},${fmtCoord(loc.longitude)}` : '🗺️ Google Maps Location: Not available yet';
  const coords = loc ? `📍 GPS Live Coordinates: ${fmtCoord(loc.latitude)}, ${fmtCoord(loc.longitude)} (${fmtAccuracy(loc.accuracy)})` : '';
  const vars: Record<string, string> = {
    name: f.name,
    locline: locline.trimEnd(),
    coords,
    time: f.time,
    emergency: f.emergency,
    live: f.liveUrl ? `🔴 Live Moving Map Tracker: ${f.liveUrl}\n` : '',
    status: f.status ?? '',
    message: f.message ?? '',
    label: f.label ?? '',
    due: f.due ?? '',
    area: f.area ? `📍 Area: ${f.area}` : '',
  };
  return template
    .replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function fmtTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-IN', { timeZone, hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', hour12: true, timeZoneName: 'short' }).format(new Date(iso));
}
