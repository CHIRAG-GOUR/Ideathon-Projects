import Link from 'next/link';

export default function DeleteAccount() {
  return (
    <div className="min-h-screen bg-emerald-950 text-emerald-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-teal-900 via-emerald-900 to-slate-900 border border-emerald-700/50 p-6 sm:p-8">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-emerald-400">Data Safety & Compliance</span>
          <h1 className="mt-2 text-3xl font-black text-white">Nutri Scan · Request Account & Data Deletion</h1>
          <p className="mt-2 text-sm text-emerald-200">Permanent account deletion and data removal portal for Nutri Scan users.</p>
        </div>

        <div className="rounded-2xl border border-emerald-800 bg-emerald-900/60 p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-emerald-100">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Data Deletion Scope</h2>
            <p>Requesting account deletion permanently erases your personal profile, saved dietary preferences, allergen sensitivity records, food scan logs, and custom pantry inventories.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. How to Request Deletion</h2>
            <div className="rounded-xl bg-emerald-950 p-4 font-mono text-xs space-y-2 text-emerald-300">
              <p>Email: <strong>support@nutriscan.ai</strong></p>
              <p>Subject: <em>&quot;Request Nutri Scan Account Deletion&quot;</em></p>
            </div>
          </section>

          <div className="flex items-center justify-between border-t border-emerald-800 pt-4 text-emerald-300 font-bold">
            <Link href="/privacy" className="hover:underline">Privacy Policy →</Link>
            <Link href="/" className="text-emerald-200 hover:text-white hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
