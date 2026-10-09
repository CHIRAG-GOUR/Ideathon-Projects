import type { ReportStatus } from '@/types';

/** Statuses an administrator may set (the rest are set by the system from real events only). */
export const ADMIN_STATUSES = ['under_review', 'assigned', 'resolved', 'rejected'] as const satisfies readonly ReportStatus[];
export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export const STATUS_LABEL: Record<ReportStatus, string> = {
  draft: 'Draft',
  processing: 'Processing',
  created: 'Report Created',
  submitted: 'Submitted',
  submission_failed: 'Submission Failed',
  pending_manual_submission: 'Pending Manual Submission',
  under_review: 'Under Review',
  assigned: 'Assigned',
  resolved: 'Resolved',
  rejected: 'Rejected',
};
