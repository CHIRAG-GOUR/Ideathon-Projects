import Link from 'next/link';
import { ReportDetail } from '@/features/reports/ReportDetail';

export default function ReportPage({ params }: { params: { id: string } }) {
  return (
    <div className="page max-w-4xl py-6 sm:py-10">
      <Link href="/reports" className="text-sm font-semibold text-gps-600">
        ← My Reports
      </Link>
      <div className="mt-3">
        <ReportDetail id={decodeURIComponent(params.id)} />
      </div>
    </div>
  );
}
