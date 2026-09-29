'use client';
import dynamic from 'next/dynamic';

// The phone app UI. Bundled inside the Android app (works offline); in a browser it runs as a preview/DEMO.
// Client-only: what it shows depends on the Android bridge, which does not exist at build time.
const AppRoot = dynamic(() => import('@/features/app/AppRoot').then((m) => m.AppRoot), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-paper" />,
});

export default function AppPage() {
  return <AppRoot />;
}
