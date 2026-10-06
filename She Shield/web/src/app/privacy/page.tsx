import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-rose-950 via-purple-950 to-slate-900 border border-rose-800/40 p-6 sm:p-8">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-rose-400">Emergency & Personal Safety</span>
          <h1 className="mt-2 text-3xl font-black text-white">She Shield · Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-300">How She Shield protects your real-time location, SOS emergency beacons, and guardian network records.</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-slate-300">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Real-Time Geolocation & Emergency SOS</h2>
            <p>
              She Shield collects high-accuracy GPS coordinates strictly when an SOS incident is triggered or during active safe-trip tracking. This data is shared exclusively with your designated emergency guardians and verified response channels.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Audio & Video Evidence Recording</h2>
            <p>
              During an active SOS beacon, She Shield may record ambient audio and short video clips. These recordings are encrypted with zero-knowledge keys and are accessible only to you and authorized emergency services.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Zero Selling of Personal Data</h2>
            <p>
              We do not sell, track, or share your movement patterns with commercial advertisers. Your safety and confidentiality are our highest priority.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">4. Contact Emergency Privacy Office</h2>
            <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-400">
              <p>Email: safety@sheshield.app</p>
              <p>Live Web App: https://she-shield-app.web.app</p>
            </div>
          </section>

          <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-rose-400 font-bold">
            <Link href="/terms" className="hover:underline">Terms & Conditions →</Link>
            <Link href="/" className="text-slate-400 hover:text-white hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
