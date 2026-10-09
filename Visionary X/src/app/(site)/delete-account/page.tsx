import Link from 'next/link';

export default function DeleteAccount() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 border border-indigo-800/40 p-6 sm:p-8">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-indigo-400">Data Safety & Compliance</span>
          <h1 className="mt-2 text-3xl font-black text-white">Visionary X · Request Account & Data Deletion</h1>
          <p className="mt-2 text-sm text-slate-300">Permanent account deletion and data removal portal pursuant to Google Play Data Safety policies.</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-slate-300">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. What data is deleted?</h2>
            <p>Upon submitting an account deletion request, Visionary X permanently purges:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>User authentication credentials and account profile records.</li>
              <li>Saved warehouse inventory records, custom SKU catalogs, and stock counts.</li>
              <li>Camera scan history, OCR logs, and cached telemetry.</li>
              <li>Device tokens and push notification registrations.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. How to request instant deletion</h2>
            <p>You can delete your account and all associated data at any time through either of the following methods:</p>
            <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs space-y-2 text-indigo-300">
              <p><strong>Option A (In-App):</strong> Navigate to Settings → Account → Tap &quot;Delete Account & Purge Data&quot;.</p>
              <p><strong>Option B (Direct Email Request):</strong> Send an email to <strong>privacy@visionaryx.ai</strong> with the subject line <em>&quot;Delete My Visionary X Account&quot;</em> from your registered email address.</p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Processing Timeframe</h2>
            <p>In-app deletion requests execute instantly. Email requests are verified and processed within 24–48 hours.</p>
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
