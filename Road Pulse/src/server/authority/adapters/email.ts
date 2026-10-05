import 'server-only';
import nodemailer from 'nodemailer';
import type { AuthorityAdapter } from './types';
import { reportText } from './types';

/**
 * For authorities that officially accept reports by email. Sent from the server only.
 * "submitted" means the mail server accepted the message for delivery to the authority's address.
 * If the server has no SMTP configured, nothing is claimed: the report stays pending manual submission.
 */
export function buildGrievanceMailto(report: Parameters<AuthorityAdapter['submitReport']>[0], authority: Parameters<AuthorityAdapter['submitReport']>[1], appUrl: string): string {
  const email = authority.email || 'commissioner.jmc@rajasthan.gov.in';
  const locationLabel = report.street || report.address?.displayName || `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`;
  const subject = `[Official Road Grievance / Sec 133 CrPC] Pothole Repair Request — ${report.id} (${locationLabel.slice(0, 45)})`;
  
  const eng = report.engineeringAnalysis;
  const body = [
    `To: Executive Engineer / Competent Authority, ${authority.name}`,
    `Subject: Urgent Road Hazard & Pothole Repair Notice`,
    ``,
    `Respected Sir / Madam,`,
    ``,
    `I am submitting an official public grievance regarding a dangerous road hazard/pothole requiring prompt asphalt patch repair:`,
    ``,
    `----------------------------------------------------`,
    `REPORT DETAILS:`,
    `• Report Reference: ${report.id}`,
    `• Location / Address: ${report.address?.displayName ?? locationLabel}`,
    report.street ? `• Road / Street: ${report.street}` : null,
    `• GPS Coordinates: ${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)} (±${Math.round(report.locationAccuracy ?? 0)}m)`,
    `• Google Maps Link: https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`,
    `• OpenStreetMap Pin: https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=19/${report.latitude}/${report.longitude}`,
    `• Severity Rating: ${report.severity.toUpperCase()}`,
    `• Detection Method: ${report.aiConfirmed ? 'Computer Vision Sensor Scan' : 'Citizen Direct Verification'}`,
    eng ? `• Technical Classification: ${eng.technicalTitle}` : null,
    eng ? `• Physical Dimensions: ~${eng.dimensions.estimatedDiameterCm} cm diameter (${eng.dimensions.depthDescription})` : null,
    eng ? `• Surface Type: ${eng.surfaceType}` : null,
    eng?.safetyHazards?.length ? `• Identified Safety Hazards: ${eng.safetyHazards.join('; ')}` : null,
    eng?.recommendedRepair ? `• Recommended IRC Repair: ${eng.recommendedRepair}` : null,
    report.notes ? `• Citizen Notes: ${report.notes}` : null,
    `• Detected At: ${report.createdAt}`,
    `----------------------------------------------------`,
    ``,
    `Under the provisions of Section 133 CrPC and the Rajasthan Municipalities / PWD Act, maintaining pothole-free safe transit routes is a statutory public duty. This hazard poses immediate risk to two-wheelers and passenger vehicles.`,
    ``,
    `Kindly direct your zonal maintenance contractor to inspect and repair this section, and reply to this email with the official grievance tracking number.`,
    ``,
    `Sincerely,`,
    `Concerned Citizen & Daily Commuter`,
    `Verified via RoadPulse (Citizen Road Safety Network) — ${appUrl}`,
  ].filter(Boolean).join('\n');

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const EmailAuthorityAdapter: AuthorityAdapter = {
  async submitReport(report, authority, { image, appUrl }) {
    if (!authority.email) return { ok: false, status: 'submission_failed', method: 'email', message: 'This authority has no email address configured.' };
    const mailtoUrl = buildGrievanceMailto(report, authority, appUrl);
    const smtp = process.env.SMTP_URL;
    if (!smtp) {
      return {
        ok: false,
        status: 'pending_manual_submission',
        method: 'email',
        message: 'Direct official email prepared. Tap below to send from your personal email client (Gmail / Outlook / Apple Mail).',
        portalUrl: mailtoUrl,
      };
    }
    try {
      const transport = nodemailer.createTransport(smtp);
      const info = await transport.sendMail({
        from: process.env.MAIL_FROM || 'RoadPulse <no-reply@roadpulse-ideathon.web.app>',
        to: authority.email,
        subject: `Pothole Report — RoadPulse — ${report.id}`,
        text: reportText(report, appUrl),
        attachments: image ? [{ filename: `${report.id}.jpg`, content: image, contentType: 'image/jpeg' }] : [],
      });
      const accepted = (info.accepted ?? []).map(String).some((a) => a.toLowerCase() === authority.email!.toLowerCase());
      return accepted
        ? { ok: true, status: 'submitted', method: 'email', externalId: info.messageId ?? null, message: `Email accepted for delivery to ${authority.email}.`, portalUrl: mailtoUrl }
        : { ok: false, status: 'submission_failed', method: 'email', message: 'The mail server did not accept the message.', portalUrl: mailtoUrl };
    } catch (err) {
      return { ok: false, status: 'submission_failed', method: 'email', message: `Email could not be sent (${(err as Error).message.slice(0, 120)}).`, portalUrl: mailtoUrl };
    }
  },
};
