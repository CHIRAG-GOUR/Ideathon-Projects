import Link from 'next/link';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-blue-950 via-cyan-950 to-slate-900 border border-cyan-800/40 p-6 sm:p-8">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-cyan-400">Road AI & Infrastructure Intelligence</span>
          <h1 className="mt-2 text-3xl font-black text-white">Road Pulse · Terms & Conditions</h1>
          <p className="mt-2 text-sm text-slate-300">Terms of service for automated road surface monitoring and municipal intelligence.</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-slate-300">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Driver Safety First Disclaimer</h2>
            <p>
              Road Pulse is an automated road inspection tool. Drivers must never interact with mobile screens or adjust dashcam mounts while actively operating a motor vehicle. Safe driving remains your highest legal priority.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Municipal Road Data Use</h2>
            <p>
              Pothole and road severity indices are generated for highway repair planning. Road Pulse does not guarantee highway hazard remediation schedules by local municipalities.
            </p>
          </section>

          <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-cyan-400 font-bold">
            <Link href="/privacy" className="hover:underline">Privacy Policy →</Link>
            <Link href="/" className="text-slate-400 hover:text-white hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
