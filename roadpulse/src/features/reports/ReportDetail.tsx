'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Check, ExternalLink, Loader2, Mail, RefreshCw, X } from 'lucide-react';
import type { RoadHazard, TimelineEvent } from '@/types';
import { api, currentUser, firebaseConfigured } from '@/lib/firebase';
import { watchHazard } from '@/lib/hazards';
import { PrivateImage } from '@/components/PrivateImage';
import { SeverityChip, StatusChip } from '@/components/Chips';
import { SOURCE, when } from '@/lib/meta';
import { formatCoords } from '@/lib/geo';
import { cn } from '@/lib/cn';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

const FAIL_KEYS = new Set<TimelineEvent['key']>(['send_failed']);

export function ReportDetail({ id, admin }: { id: string; admin?: boolean }) {
  const [r, setR] = useState<RoadHazard | null | undefined>(undefined);
  const [mine, setMine] = useState(false);
  const [showAnnotated, setShowAnnotated] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) return setR(null);
    let un: (() => void) | undefined;
    watchHazard(id, setR).then((u) => (un = u));
    currentUser().then((u) => setMine(Boolean(u)));
    return () => un?.();
  }, [id]);

  if (r === undefined) return <div className="h-64 animate-pulse rounded-3xl bg-paper-200" />;
  if (r === null) return <p className="card p-8 text-center font-semibold text-graphite-muted">Report not found.</p>;

  const canSeePhoto = admin || mine;
  const img = showAnnotated && r.annotatedPath ? r.annotatedPath : r.imagePath;
  return (
    <div className="space-y-4" data-testid="report-detail">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-graphite-muted">
            {SOURCE[r.source].icon} {SOURCE[r.source].label}
          </p>
          <h1 className="num font-display text-3xl font-bold" data-testid="detail-id">
            {r.id}
          </h1>
        </div>
        <StatusChip status={r.reportStatus} className="px-3 py-1.5 text-sm" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card overflow-hidden">
          {canSeePhoto ? <PrivateImage path={img} alt="Report photo" className="aspect-[4/3] w-full" /> : <div className="flex aspect-[4/3] items-center justify-center bg-paper-200 p-6 text-center text-sm font-semibold text-graphite-muted">Photos are visible only to the reporter and road authorities.</div>}
          {canSeePhoto && r.annotatedPath && (
            <div className="flex gap-1 p-2">
              {[true, false].map((a) => (
                <button key={String(a)} onClick={() => setShowAnnotated(a)} className={cn('chip py-1.5', showAnnotated === a ? 'bg-graphite text-white' : 'bg-paper-100 text-graphite-soft')}>
                  {a ? 'AI detection overlay' : 'Original photo'}
                </button>
              ))}
            </div>
          )}
        </div>
        <MapView center={[r.latitude, r.longitude]} zoom={17} pin={{ lat: r.latitude, lon: r.longitude }} className="h-full min-h-[260px] w-full overflow-hidden rounded-3xl" />
      </div>
      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <Row label="Location" value={r.address?.displayName ?? 'Address unavailable'} />
        <Row label="Coordinates" value={`${formatCoords(r.latitude, r.longitude)}${r.locationAccuracy != null ? ` · ±${Math.round(r.locationAccuracy)} m` : ''}${r.locationAdjusted ? ' · adjusted on map' : ''}`} mono />
        <Row label="Detection confidence" value={r.aiConfirmed && r.confidence != null ? `${Math.round(r.confidence * 100)}%` : 'Not AI-confirmed (reporter’s observation)'} />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-graphite-muted">Severity</p>
          <SeverityChip severity={r.severity} estimated={r.severityEstimated} className="mt-1" />
        </div>
        <Row label="Created" value={when(r.createdAt)} />
        <Row label="Authority" value={r.authorityName ?? 'Not connected for this area'} />
        {r.externalReportId && <Row label="Authority reference" value={r.externalReportId} mono />}
        {r.street && <Row label="Road / street" value={r.street} />}
        {r.notes && <Row label="Notes" value={r.notes} />}
        {r.groupSize > 1 && <Row label="Same hazard" value={`${r.groupSize} reports for the same road hazard`} />}
        {r.statusNote && <Row label="Status detail" value={r.statusNote} />}
      </div>
      <div className="card p-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-graphite-muted">Timeline</p>
        <ol className="mt-3 space-y-2.5" data-testid="timeline">
          {r.timeline.map((t, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className={cn('mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full', FAIL_KEYS.has(t.key) ? 'bg-pothole-500 text-white' : 'bg-road-500 text-white')}>{FAIL_KEYS.has(t.key) ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}</span>
              <div>
                <p className="font-semibold text-graphite">{t.label}</p>
                <p className="text-xs text-graphite-muted">{when(t.at)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      {mine && r.reportStatus === 'submission_failed' && (
        <button
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            try {
              await api(`/api/reports/${r.id}/retry`, { body: {} });
            } catch (e) {
              setMsg((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="btn btn-danger"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Retry sending
        </button>
      )}
      {r.authorityPortal?.startsWith('mailto:') && (
        <div className="card p-5 bg-paper-50 border border-paper-200">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-graphite-muted">Official Grievance Action</p>
          <p className="mt-1 text-sm font-semibold text-graphite">Send directly from your personal mailbox to {r.authorityName || 'Road Authority'}</p>
          <p className="mt-1 text-xs text-graphite-soft">Opens your native email app (Gmail / Outlook / Apple Mail) with pre-filled GPS, map pin, severity, and photo reference so you get direct replies from the engineers.</p>
          <a href={r.authorityPortal} className="btn btn-primary mt-3 w-full sm:w-auto">
            <Mail className="h-4 w-4" /> Send from My Email (Gmail / Mail Client)
          </a>
        </div>
      )}
      {r.reportStatus === 'pending_manual_submission' && r.authorityPortal && !r.authorityPortal.startsWith('mailto:') && (
        <a href={r.authorityPortal} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
          Continue to Official Reporting Portal <ExternalLink className="h-4 w-4" />
        </a>
      )}
      {msg && <p className="text-sm font-semibold text-pothole-600">{msg}</p>}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-wider text-graphite-muted">{label}</p>
      <p className={cn('mt-1 break-words font-semibold text-graphite', mono && 'num')}>{value}</p>
    </div>
  );
}
