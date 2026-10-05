'use client';
import dynamic from 'next/dynamic';

// Client-only: the app reads the device (bridge, storage, location) from the first render.
const AppRoot = dynamic(() => import('@/AppRoot'), { ssr: false, loading: () => <div className="min-h-screen bg-cream" /> });

export default function Page() {
  return <AppRoot />;
}
