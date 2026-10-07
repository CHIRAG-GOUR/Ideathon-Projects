'use client';
import dynamic from 'next/dynamic';

const LiveView = dynamic(() => import('@/LiveView'), { ssr: false, loading: () => <div className="min-h-screen bg-[#F4F8F6]" /> });

export default function Page() {
  return <LiveView />;
}
