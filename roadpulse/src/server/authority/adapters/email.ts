import 'server-only';
import nodemailer from 'nodemailer';
import type { AuthorityAdapter } from './types';
import { reportText } from './types';

/**
 * For authorities that officially accept reports by email. Sent from the server only.
 * "submitted" means the mail server accepted the message for delivery to the authority's address.
 * If the server has no SMTP configured, nothing is claimed: the report stays pending manual submission.
 */
export const EmailAuthorityAdapter: AuthorityAdapter = {
  async submitReport(report, authority, { image, appUrl }) {
    if (!authority.email) return { ok: false, status: 'submission_failed', method: 'email', message: 'This authority has no email address configured.' };
    const smtp = process.env.SMTP_URL;
    if (!smtp) {
      return {
        ok: false,
        status: 'pending_manual_submission',
        method: 'email',
        message: 'Automatic email isn’t set up on this RoadPulse server yet. You can email the authority yourself.',
        portalUrl: `mailto:${authority.email}?subject=${encodeURIComponent(`Pothole Report — RoadPulse — ${report.id}`)}`,
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
        ? { ok: true, status: 'submitted', method: 'email', externalId: info.messageId ?? null, message: `Email accepted for delivery to ${authority.email}.` }
        : { ok: false, status: 'submission_failed', method: 'email', message: 'The mail server did not accept the message.' };
    } catch (err) {
      return { ok: false, status: 'submission_failed', method: 'email', message: `Email could not be sent (${(err as Error).message.slice(0, 120)}).` };
    }
  },
};
