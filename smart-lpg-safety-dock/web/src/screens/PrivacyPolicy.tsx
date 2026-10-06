import { go } from '../hooks/useRoute';

export default function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="rounded-xl3 bg-gradient-to-br from-lpg-900 via-lpg-800 to-graphite p-6 text-white sm:p-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-lpg-300">IoT Safety & Telemetry</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-white/80">How Smart LPG Dock manages sensor telemetry, cylinder weight readings, and safety alerts.</p>
      </div>

      <div className="flex items-center justify-between px-1 text-xs text-graphite-muted">
        <span>Last Updated: October 6, 2026</span>
        <span>Version 1.0.0 · Smart LPG Safety Dock</span>
      </div>

      <div className="space-y-6 rounded-xl2 border border-line bg-white p-6 sm:p-8 text-sm leading-relaxed text-graphite">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-graphite">1. Telemetry & Sensor Data Collection</h2>
          <p>
            Smart LPG Dock processes real-time safety metrics emitted by connected IoT load-cells, MQ gas sensors, flame sensors, and solenoid valves:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Cylinder Mass & Weight Telemetry:</strong> Continuous tare and net LPG mass in kilograms for burn-rate prediction and refill timing.</li>
            <li><strong>Hazard & Air Quality Data:</strong> Parts-per-million (PPM) hydrocarbon gas concentrations, thermal gradient metrics, and flame detection events.</li>
            <li><strong>Valve Actuator States:</strong> Solenoid valve open/close emergency trip status and manual override logs.</li>
            <li><strong>Emergency Contact Records:</strong> Phone numbers and email addresses configured to receive critical gas leak SOS dispatch alerts.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-graphite">2. Purpose of Data Processing</h2>
          <p>Telemetry data is collected exclusively to ensure consumer and commercial kitchen gas safety:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Triggering instant audible alarms and automatic solenoid shutoff when gas concentrations exceed 350 PPM.</li>
            <li>Generating predictive refill alerts before unexpected cylinder depletion.</li>
            <li>Visualizing telemetry curves and historical event audits on the companion dashboard.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-graphite">3. Data Security & Storage</h2>
          <p>
            All remote telemetry is encrypted in transit over TLS/WSS. In prototype/simulation mode, all sensor streams execute client-side inside the local simulation loop and are never persisted to external cloud databases without explicit user pairing.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-graphite">4. Contact & Support</h2>
          <div className="rounded-xl bg-cream-100 p-4 font-mono text-xs">
            <p><strong>Smart LPG Safety Engineering Team</strong></p>
            <p>Email: safety@smartlpgdock.io</p>
            <p>Live Web App: https://smart-lpg-safety-dock.web.app</p>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4 font-bold">
          <button onClick={() => go('terms')} className="text-lpg-600 hover:underline">
            View Terms & Conditions →
          </button>
          <button onClick={() => go('dashboard')} className="text-graphite hover:underline">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
