import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 border border-emerald-800/40 p-6 sm:p-8">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-emerald-400">Industrial Workplace Safety</span>
          <h1 className="mt-2 text-3xl font-black text-white">Fortiva · Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-300">How Fortiva manages worker PPE compliance, environmental sensors, and industrial health telemetry.</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-slate-300">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Worker Safety & PPE Telemetry</h2>
            <p>
              Fortiva monitors smart helmet telemetry, impact sensors, high-heat exposure, and optical PPE verification strictly within industrial work zones to protect workers against workplace hazards.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Workplace Data Protection & Anonymization</h2>
            <p>
              Individual telemetry is aggregated for enterprise compliance audits and safety reporting in accordance with OSHA and international industrial health regulations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Contact Enterprise Compliance</h2>
            <p className="font-mono text-xs text-slate-400">Email: compliance@fortiva-safecheck.io · Live Web App: https://fortiva-safecheck.web.app</p>
          </section>

          <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-emerald-400 font-bold">
            <Link href="/terms" className="hover:underline">Terms & Conditions →</Link>
            <Link href="/" className="text-slate-400 hover:text-white hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
