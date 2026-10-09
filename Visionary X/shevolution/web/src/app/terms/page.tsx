import Link from 'next/link';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-rose-950 text-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-purple-900 via-rose-900 to-slate-900 border border-rose-700/50 p-6 sm:p-8">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-rose-300">Safe Mobility Platform</span>
          <h1 className="mt-2 text-3xl font-black">Shevolution · Terms & Conditions</h1>
          <p className="mt-2 text-sm text-rose-100/80">Safe mobility platform terms, rider conduct, and community guidelines.</p>
        </div>

        <div className="rounded-2xl border border-rose-900 bg-rose-950/80 p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-rose-100">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Community Code of Conduct</h2>
            <p>
              All riders and drivers on Shevolution agree to treat each other with dignity, mutual respect, and courtesy. Any violation of platform safety rules will result in immediate suspension.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Ride-Sharing Safety Terms</h2>
            <p>
              Shevolution provides ride-matching and emergency escort coordination tools. Users must follow road safety protocols and adhere to local transport regulations.
            </p>
          </section>

          <div className="flex items-center justify-between border-t border-rose-800 pt-4 text-rose-300 font-bold">
            <Link href="/privacy" className="hover:underline">Privacy Policy →</Link>
            <Link href="/" className="text-rose-200 hover:text-white hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
