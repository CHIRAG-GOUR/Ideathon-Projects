import Link from 'next/link';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-rose-950 via-purple-950 to-slate-900 border border-rose-800/40 p-6 sm:p-8">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-rose-400">Emergency & Personal Safety</span>
          <h1 className="mt-2 text-3xl font-black text-white">She Shield · Terms & Conditions</h1>
          <p className="mt-2 text-sm text-slate-300">Terms of service, emergency alert protocols, and response disclaimers.</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-slate-300">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Emergency Response & Auxiliary Tool Notice</h2>
            <p>
              She Shield is a personal safety companion application designed to expedite guardian notification and emergency beacon broadcasting. She Shield does not guarantee response times by municipal police, ambulance, or private security units and should be utilized in tandem with direct emergency calls (e.g., 112 / 911).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. False Alarms & Responsible Usage</h2>
            <p>
              Users agree to use SOS trigger features responsibly and cancel false alarms promptly using the secure pin mechanism to prevent unnecessary emergency dispatch.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, She Shield disclaims liability for carrier signal drops, battery exhaustion, hardware malfunctions, or delays in third-party responder interventions.
            </p>
          </section>

          <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-rose-400 font-bold">
            <Link href="/privacy" className="hover:underline">Privacy Policy →</Link>
            <Link href="/" className="text-slate-400 hover:text-white hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
