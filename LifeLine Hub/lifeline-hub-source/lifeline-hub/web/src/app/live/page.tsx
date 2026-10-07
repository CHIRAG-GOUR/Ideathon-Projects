'use client';
import dynamic from 'next/dynamic';

const LiveView = dynamic(() => import('@/LiveView'), { ssr: false, loading: () => <div className="min-h-screen bg-[#081325]" /> });

export default function Page() {
  return <LiveView />;
}
