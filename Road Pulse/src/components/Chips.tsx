import type { ReportStatus, Severity } from '@/types';
import { SEVERITY, STATUS } from '@/lib/meta';
import { cn } from '@/lib/cn';

export function SeverityChip({ severity, estimated, className }: { severity: Severity; estimated?: boolean; className?: string }) {
  const m = SEVERITY[severity];
  return (
    <span className={cn('chip', className)} style={{ background: m.soft, color: m.ink }} data-severity={severity}>
      <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
      {m.label}
      {estimated && severity !== 'unknown' && <span className="font-semibold opacity-70">· Automated Rating</span>}
    </span>
  );
}

export function StatusChip({ status, className }: { status: ReportStatus; className?: string }) {
  const m = STATUS[status];
  return (
    <span className={cn('chip', className)} style={{ background: m.soft, color: m.ink }} data-status={status}>
      {m.label}
    </span>
  );
}

/** Production Live & Active Badges */
export function ModeBadge({ mode, className }: { mode?: 'live' | 'active' | string; className?: string }) {
  return (
    <span className={cn('chip bg-road-50 text-road-700 ring-1 ring-inset ring-road-200', className)} data-mode="live">
      <span className="h-2 w-2 animate-pulse rounded-full bg-road-500" /> LIVE
    </span>
  );
}
