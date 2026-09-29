import 'server-only';
import type { AuthorityAdapter } from './types';
import { reportText } from './types';

/**
 * For authorities with an official, documented reporting API. The report counts as submitted only when
 * the API answers 2xx; its reference ID is stored when it returns one.
 */
export const ApiAuthorityAdapter: AuthorityAdapter = {
  async submitReport(report, authority, { image, appUrl }) {
    if (!authority.endpoint) return { ok: false, status: 'submission_failed', method: 'api', message: 'No API endpoint is configured for this authority.' };
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (authority.apiAuthHeader && authority.apiKeySecret) {
      const key = process.env[authority.apiKeySecret];
      if (!key) return { ok: false, status: 'submission_failed', method: 'api', message: 'The API key for this authority isn’t configured on the server.' };
      headers[authority.apiAuthHeader] = key;
    }
    const body = {
      reportId: report.id,
      category: authority.category ?? 'pothole',
      source: report.source,
      latitude: report.latitude,
      longitude: report.longitude,
      locationAccuracyM: report.locationAccuracy,
      address: report.address?.displayName ?? null,
      street: report.street,
      reportedAt: report.createdAt,
      severity: report.severity,
      severityEstimated: report.severityEstimated,
      aiConfirmed: report.aiConfirmed,
      confidence: report.confidence,
      notes: report.notes,
      description: reportText(report, appUrl),
      imageJpegBase64: image ? image.toString('base64') : null,
    };
    try {
      const res = await fetch(authority.endpoint, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(15000), cache: 'no-store' });
      const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      const ext = json && ['id', 'reportId', 'referenceId', 'ticketId', 'complaintId'].map((k) => json[k]).find((v) => typeof v === 'string' || typeof v === 'number');
      if (res.ok) return { ok: true, status: 'submitted', method: 'api', httpStatus: res.status, externalId: ext != null ? String(ext) : null, message: `Accepted by ${authority.name}.` };
      return { ok: false, status: 'submission_failed', method: 'api', httpStatus: res.status, message: `${authority.name} rejected the report (HTTP ${res.status}).` };
    } catch (err) {
      const timeout = (err as Error).name === 'TimeoutError';
      return { ok: false, status: 'submission_failed', method: 'api', httpStatus: null, message: timeout ? `${authority.name} didn’t respond in time.` : `Couldn’t reach ${authority.name}.` };
    }
  },
};
