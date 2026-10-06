import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-amber-950 via-orange-950 to-neutral-900 border border-amber-800/40 p-6 sm:p-8">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-amber-400">Community Safety Intelligence</span>
          <h1 className="mt-2 text-3xl font-black text-white">Safety Warriors · Privacy Policy</h1>
          <p className="mt-2 text-sm text-neutral-300">How Safety Warriors handles community hazard feeds, location tagging, and responder alerts.</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-neutral-300">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Community Incident Reporting</h2>
            <p>
              Safety Warriors collects user-submitted hazard reports, road risks, lighting conditions, and emergency alerts. Location data attached to reports is anonymized to protect individual contributor identities while providing actionable safety maps.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Live Escort & Route Guidance</h2>
            <p>
              When navigating safe routes or requesting volunteer community escorts, real-time telemetry is shared only with verified members of your active escort session.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Data Retention & Contact</h2>
            <p>Incident logs are retained for municipal infrastructure analysis. Contact us at privacy@safetywarriors.org.</p>
            <p className="font-mono text-xs text-neutral-400">Live Web App: https://safety-warriors-app.web.app</p>
          </section>

          <div className="flex items-center justify-between border-t border-neutral-800 pt-4 text-amber-400 font-bold">
            <Link href="/terms" className="hover:underline">Terms & Conditions →</Link>
            <Link href="/" className="text-neutral-400 hover:text-white hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
