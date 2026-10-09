import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 border border-indigo-800/40 p-6 sm:p-8">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-indigo-400">Enterprise Computer Vision</span>
          <h1 className="mt-2 text-3xl font-black text-white">Visionary X · Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-300">How Visionary X secures edge video analytics, spatial neural nets, and optical scans.</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-slate-300">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Computer Vision Processing Scope</h2>
            <p>
              Visionary X provides edge computer vision models for warehouse inventory counting, defect detection, and automated spatial tracking. Camera feeds are processed in volatile memory with zero cloud video archiving unless explicitly configured by the enterprise client.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Enterprise Security & Isolation</h2>
            <p>
              All neural inference pipelines adhere to enterprise SOC-2 and ISO 27001 data isolation guidelines.
            </p>
          </section>

          <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-indigo-400 font-bold">
            <Link href="/terms" className="hover:underline">Terms & Conditions →</Link>
            <Link href="/" className="text-slate-400 hover:text-white hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
