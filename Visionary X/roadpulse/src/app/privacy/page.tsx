import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-blue-950 via-cyan-950 to-slate-900 border border-cyan-800/40 p-6 sm:p-8">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-cyan-400">Road AI & Infrastructure Intelligence</span>
          <h1 className="mt-2 text-3xl font-black text-white">Road Pulse · Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-300">How Road Pulse processes dashcam video streams, pothole detection telemetry, and road quality metrics.</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-slate-300">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Edge Optical Processing & Privacy Blurring</h2>
            <p>
              Road Pulse uses edge computer vision models to detect asphalt potholes, road fissures, and missing street signs. All pedestrian faces and vehicle license plates are automatically blurred on-device prior to transmitting municipal quality reports.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Accelerometer & GPS Telemetry</h2>
            <p>
              Roughness index (IRI) readings and road bump coordinates are aggregated to build public infrastructure repair maps for municipal public works departments.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Contact Road Safety Team</h2>
            <p className="font-mono text-xs text-slate-400">Email: contact@roadpulse.ai · Live Web App: https://roadpulse-ideathon.web.app</p>
          </section>

          <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-cyan-400 font-bold">
            <Link href="/terms" className="hover:underline">Terms & Conditions →</Link>
            <Link href="/" className="text-slate-400 hover:text-white hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
