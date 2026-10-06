import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-rose-950 text-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-purple-900 via-rose-900 to-slate-900 border border-rose-700/50 p-6 sm:p-8">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-rose-300">Safe Mobility Platform</span>
          <h1 className="mt-2 text-3xl font-black">Shevolution · Privacy Policy</h1>
          <p className="mt-2 text-sm text-rose-100/80">How Shevolution secures rider verification, ride-share telemetry, and driver credentials.</p>
        </div>

        <div className="rounded-2xl border border-rose-900 bg-rose-950/80 p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-rose-100">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Verified Rider & Driver Profile Data</h2>
            <p>
              Shevolution verifies identity credentials to ensure a trusted, women-only mobility network. Profile information is encrypted and never exposed to unverified parties.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Live Trip Telemetry</h2>
            <p>
              Trip routes and vehicle telemetry are tracked during active journeys to ensure route safety and provide live sharing with trusted family contacts.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Contact Support</h2>
            <p className="font-mono text-xs text-rose-300">Email: privacy@shevolution.org · Live Web App: https://shevolution-ideathon.web.app</p>
          </section>

          <div className="flex items-center justify-between border-t border-rose-800 pt-4 text-rose-300 font-bold">
            <Link href="/terms" className="hover:underline">Terms & Conditions →</Link>
            <Link href="/" className="text-rose-200 hover:text-white hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
