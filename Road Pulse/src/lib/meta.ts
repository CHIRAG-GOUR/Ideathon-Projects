import type { HazardSource, ReportStatus, Severity } from '@/types';
import { STATUS_LABEL } from '@/server/authority/status';

export const SEVERITY: Record<Severity, { label: string; color: string; soft: string; ink: string }> = {
  high: { label: 'High', color: '#E5484D', soft: '#FFDEDE', ink: '#8F2226' },
  medium: { label: 'Medium', color: '#E59A0B', soft: '#FEEDC2', ink: '#8A5A06' },
  low: { label: 'Low', color: '#2F9A5E', soft: '#D6EEDF', ink: '#1C653D' },
  unknown: { label: 'Unknown', color: '#A7ADB3', soft: '#EDE9E2', ink: '#4A5057' },
};

export const STATUS: Record<ReportStatus, { label: string; soft: string; ink: string }> = {
  draft: { label: STATUS_LABEL.draft, soft: '#EDE9E2', ink: '#4A5057' },
  processing: { label: STATUS_LABEL.processing, soft: '#DCE8FF', ink: '#2F6FDB' },
  created: { label: STATUS_LABEL.created, soft: '#EEF4FF', ink: '#2F6FDB' },
  submitted: { label: STATUS_LABEL.submitted, soft: '#D6EEDF', ink: '#1C653D' },
  submission_failed: { label: STATUS_LABEL.submission_failed, soft: '#FFDEDE', ink: '#8F2226' },
  pending_manual_submission: { label: STATUS_LABEL.pending_manual_submission, soft: '#FEEDC2', ink: '#8A5A06' },
  under_review: { label: STATUS_LABEL.under_review, soft: '#DCE8FF', ink: '#2F6FDB' },
  assigned: { label: STATUS_LABEL.assigned, soft: '#E9E3FF', ink: '#5B3FC4' },
  resolved: { label: STATUS_LABEL.resolved, soft: '#D6EEDF', ink: '#1C653D' },
  rejected: { label: STATUS_LABEL.rejected, soft: '#EDE9E2', ink: '#4A5057' },
};

export const SOURCE: Record<HazardSource, { label: string; icon: string }> = {
  vehicle: { label: 'Vehicle detection', icon: '🚗' },
  citizen: { label: 'Citizen report', icon: '📱' },
};

export function when(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function placeName(a: { road?: string | null; locality?: string | null; city?: string | null } | null, lat: number, lon: number) {
  const parts = [a?.road, a?.locality, a?.city].filter(Boolean);
  return parts.length ? parts.join(', ') : `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}
