import type { AuthorityAdapter } from './types';

/**
 * Official portal / manual channels: RoadPulse never automates or scrapes a government website.
 * The citizen is sent to the official page; nothing is claimed as submitted.
 */
export const PortalAuthorityAdapter: AuthorityAdapter = {
  async submitReport(_r, authority) {
    return {
      ok: false,
      status: 'pending_manual_submission',
      method: authority.submissionMethod === 'portal' ? 'portal' : 'manual',
      portalUrl: authority.endpoint ?? null,
      message: authority.endpoint
        ? `${authority.name} takes reports on its official portal. Continue there to submit it — RoadPulse has saved your report.`
        : `${authority.name} doesn’t have an automated channel configured. Your report is saved.`,
    };
  },
};
