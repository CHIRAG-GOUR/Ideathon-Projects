'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Camera } from 'lucide-react';
import type { RoadHazard } from '@/types';
import { currentUser, firebaseConfigured } from '@/lib/firebase';
import { watchHazards } from '@/lib/hazards';
import { PrivateImage } from '@/components/PrivateImage';
import { SeverityChip, StatusChip } from '@/components/Chips';
import { placeName, when } from '@/lib/meta';

export default function MyReports() {
  const [list, setList] = useState<RoadHazard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let un: (() => void) | undefined;
    (async () => {
      if (!firebaseConfigured) return setList([]);
      const user = await currentUser();
      if (!user) return setList([]);
      un = await watchHazards({ ownerUid: user.uid }, setList, () => setError('Couldn’t load your reports.'));
    })();
    return () => un?.();
  }, []);

  return (
    <div className="page max-w-3xl py-6 sm:py-10">
      <p className="eyebrow">Reports</p>
      <h1 className="display mt-1 text-3xl">My Reports</h1>
      <p className="mt-1 text-sm text-graphite-muted">Reports you sent from this device. Status updates appear here automatically.</p>
      {error && <p className="mt-4 text-sm font-semibold text-pothole-600">{error}</p>}
      {list === null && <div className="mt-6 h-28 animate-pulse rounded-3xl bg-paper-200" />}
      {list && list.length === 0 && (
        <div className="mt-6 card p-8 text-center" data-testid="reports-empty">
          <p className="text-4xl">🛣️</p>
          <p className="mt-2 font-bold text-graphite">No reports yet</p>
          <p className="text-sm text-graphite-muted">See a pothole? It takes about 30 seconds.</p>
          <Link href="/report" className="btn btn-danger mt-4">
            <Camera className="h-4 w-4" /> Report a Pothole
          </Link>
        </div>
      )}
      <div className="mt-6 space-y-3" data-testid="reports-list">
        {list?.map((r) => (
          <Link key={r.id} href={`/reports/${r.id}`} className="card flex gap-4 p-3 transition hover:shadow-lift" data-testid="report-card">
            <PrivateImage path={r.annotatedPath ?? r.imagePath} alt="Report photo" className="h-24 w-28 flex-none rounded-2xl" />
            <div className="min-w-0 flex-1 py-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="num font-bold text-graphite">{r.id}</p>
                <StatusChip status={r.reportStatus} />
              </div>
              <p className="mt-0.5 truncate text-sm text-graphite-soft">{placeName(r.address, r.latitude, r.longitude)}</p>
              <p className="text-xs text-graphite-muted">{when(r.createdAt)}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <SeverityChip severity={r.severity} estimated={r.severityEstimated} />
                <span className="text-xs font-semibold text-graphite-muted">{r.authorityName ?? 'No authority connected'}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
