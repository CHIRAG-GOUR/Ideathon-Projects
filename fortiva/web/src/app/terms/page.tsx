import Link from 'next/link';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 border border-emerald-800/40 p-6 sm:p-8">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-emerald-400">Industrial Workplace Safety</span>
          <h1 className="mt-2 text-3xl font-black text-white">Fortiva · Terms & Conditions</h1>
          <p className="mt-2 text-sm text-slate-300">Industrial safety compliance software terms and operational standards.</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-slate-300">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Industrial Safety Software Scope</h2>
            <p>
              Fortiva provides real-time sensor diagnostics and hazard notifications for enterprise industrial facilities. It serves as an assistive safety monitoring tool and does not replace mandatory on-site safety officers or emergency evacuation plans.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Device Calibration & Compliance</h2>
            <p>
              Facility managers are responsible for routine inspection, battery maintenance, and calibration of IoT sensors connected to the Fortiva safety hub.
            </p>
          </section>

          <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-emerald-400 font-bold">
            <Link href="/privacy" className="hover:underline">Privacy Policy →</Link>
            <Link href="/" className="text-slate-400 hover:text-white hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
