import { createHmac, timingSafeEqual } from 'node:crypto';
import type { DeliveryStatus } from '../../shared/src/types';

/**
 * Server-side SMS (used only when the phone could not send the SMS itself).
 * Configured with the SHEVOLUTION_SMS secret: "none", or JSON
 *   {"provider":"twilio","accountSid":"AC…","authToken":"…","from":"+1…" | "messagingServiceSid":"MG…"}
 * India: A2P SMS needs DLT registration of the sender and templates with your provider.
 * A provider "accepted" response is recorded as "submitted", never as "delivered";
 * delivery only comes from the provider's status callback.
 */
export interface SmsConfig {
  provider: 'twilio';
  accountSid: string;
  authToken: string;
  from?: string;
  messagingServiceSid?: string;
  apiBase?: string; // tests point this at a local fake
}

export function parseSmsConfig(raw: string | undefined): SmsConfig | null {
  if (!raw || raw.trim() === 'none') return null;
  try {
    const c = JSON.parse(raw);
    return c.provider === 'twilio' && c.accountSid && c.authToken && (c.from || c.messagingServiceSid) ? c : null;
  } catch {
    return null;
  }
}

export interface SmsResult {
  status: DeliveryStatus;
  providerId: string | null;
  error: string | null;
}

export async function sendSms(cfg: SmsConfig | null, to: string, body: string, statusCallback: string | null): Promise<SmsResult> {
  if (!cfg) return { status: 'not_configured', providerId: null, error: 'No SMS provider configured' };
  const form = new URLSearchParams({ To: to, Body: body });
  if (cfg.messagingServiceSid) form.set('MessagingServiceSid', cfg.messagingServiceSid);
  else form.set('From', cfg.from!);
  if (statusCallback) form.set('StatusCallback', statusCallback);
  try {
    const res = await fetch(`${cfg.apiBase ?? 'https://api.twilio.com'}/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
    const j = (await res.json().catch(() => ({}))) as { sid?: string; message?: string; status?: string };
    if (!res.ok || !j.sid) return { status: 'failed', providerId: null, error: j.message ?? `Provider returned ${res.status}` };
    return { status: j.status === 'failed' || j.status === 'undelivered' ? 'failed' : 'submitted', providerId: j.sid, error: null };
  } catch (e) {
    return { status: 'failed', providerId: null, error: (e as Error).message };
  }
}

/** Twilio request signature: base64(HMAC-SHA1(authToken, url + sorted key/value pairs)). */
export function validTwilioSignature(authToken: string, url: string, params: Record<string, string>, signature: string): boolean {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('');
  const expected = createHmac('sha1', authToken).update(data).digest();
  const got = Buffer.from(signature, 'base64');
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export function mapProviderStatus(s: string): DeliveryStatus | null {
  if (s === 'delivered') return 'delivered';
  if (s === 'failed' || s === 'undelivered') return 'failed';
  if (s === 'sent' || s === 'queued' || s === 'accepted' || s === 'sending') return 'submitted';
  return null;
}
