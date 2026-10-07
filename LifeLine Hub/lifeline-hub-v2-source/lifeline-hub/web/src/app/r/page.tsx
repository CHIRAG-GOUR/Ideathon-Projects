'use client';
import dynamic from 'next/dynamic';

// Responder access (Health Vault QR). Rewritten from /r/{token} by Firebase Hosting.
const ResponderView = dynamic(() => import('@/ResponderView'), { ssr: false, loading: () => <div className="min-h-screen bg-[#F4F8F6]" /> });

export default function Page() {
  return <ResponderView />;
}
