import Link from 'next/link';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-amber-950 via-orange-950 to-neutral-900 border border-amber-800/40 p-6 sm:p-8">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-amber-400">Community Safety Intelligence</span>
          <h1 className="mt-2 text-3xl font-black text-white">Safety Warriors · Terms & Conditions</h1>
          <p className="mt-2 text-sm text-neutral-300">Community guidelines, reporting obligations, and platform usage terms.</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-neutral-300">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Community Reporting Standards</h2>
            <p>
              Users agree to submit truthful, accurate, and non-defamatory safety alerts. False reports, harassment, or misuse of emergency beacon features will result in immediate termination of access.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Voluntary Community Escorts</h2>
            <p>
              Safety Warriors facilitates peer-to-peer safety coordination. Community escorts and volunteers act independently; users are advised to exercise personal caution and utilize official public safety channels.
            </p>
          </section>

          <div className="flex items-center justify-between border-t border-neutral-800 pt-4 text-amber-400 font-bold">
            <Link href="/privacy" className="hover:underline">Privacy Policy →</Link>
            <Link href="/" className="text-neutral-400 hover:text-white hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
