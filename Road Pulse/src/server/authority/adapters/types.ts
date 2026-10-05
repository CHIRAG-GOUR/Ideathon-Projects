import type { RoadAuthority, RoadHazard, SubmissionResult } from '@/types';

export interface AuthorityAdapter {
  submitReport(report: RoadHazard, authority: RoadAuthority, ctx: { image: Buffer | null; appUrl: string }): Promise<SubmissionResult>;
}

/** The plain-text report every adapter sends (same facts, no embellishment). */
export function reportText(r: RoadHazard, appUrl: string): string {
  const lines = [
    `Report ID: ${r.id}`,
    `Type: Pothole (${r.source === 'citizen' ? 'citizen report' : 'vehicle-mounted detection'})`,
    `Location: ${r.address?.displayName ?? 'Address not available'}`,
    r.street ? `Road / street (reporter): ${r.street}` : null,
    `Coordinates: ${r.latitude.toFixed(6)}, ${r.longitude.toFixed(6)}${r.locationAccuracy != null ? ` (±${Math.round(r.locationAccuracy)} m${r.locationAdjusted ? ', position adjusted by reporter on the map' : ''})` : ''}`,
    `Map: https://www.openstreetmap.org/?mlat=${r.latitude}&mlon=${r.longitude}#map=19/${r.latitude}/${r.longitude}`,
    `Reported at: ${r.createdAt}`,
    r.aiConfirmed && r.confidence != null
      ? `Vision detection: pothole, confidence ${Math.round(r.confidence * 100)}% (edge sensor model)`
      : `Vision detection: not confirmed — reporter's own observation`,
    `Estimated severity: ${r.severity}${r.severityEstimated ? ' (Vision sensor analysis from photo)' : ''}`,
    r.notes ? `Reporter notes: ${r.notes}` : null,
    r.groupSize > 1 ? `Related reports at this spot: ${r.groupSize}` : null,
    '',
    `Sent by RoadPulse — ${appUrl}`,
  ];
  return lines.filter((l) => l !== null).join('\n');
}
