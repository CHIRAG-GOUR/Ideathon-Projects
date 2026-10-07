'use client';
import dynamic from 'next/dynamic';

// Responder access (Health Vault QR). Rewritten from /r/{token} by Firebase Hosting.
const ResponderView = dynamic(() => import('@/ResponderView'), { ssr: false, loading: () => <div className="min-h-screen bg-[#081325]" /> });

export default function Page() {
  return <ResponderView />;
}
