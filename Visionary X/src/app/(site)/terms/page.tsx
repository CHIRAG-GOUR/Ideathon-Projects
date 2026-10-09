import Link from 'next/link';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 border border-indigo-800/40 p-6 sm:p-8">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-indigo-400">Enterprise Computer Vision</span>
          <h1 className="mt-2 text-3xl font-black text-white">Visionary X · Terms & Conditions</h1>
          <p className="mt-2 text-sm text-slate-300">Enterprise software license terms, model accuracy SLAs, and acceptable use.</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-slate-300">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Vision AI License & Intellectual Property</h2>
            <p>
              Visionary X grants a non-exclusive license to deploy optical scanning neural models. All core neural architecture weights, SDKs, and platform APIs remain the proprietary intellectual property of Visionary X.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Inference Performance & SLA</h2>
            <p>
              Vision inference latency and precision depend on client hardware configurations and optical lighting conditions. Enterprise SLA terms apply as defined in individual service contracts.
            </p>
          </section>

          <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-indigo-400 font-bold">
            <Link href="/privacy" className="hover:underline">Privacy Policy →</Link>
            <Link href="/" className="text-slate-400 hover:text-white hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
