import { go } from '../hooks/useRoute';

export default function TermsAndConditions() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="rounded-xl3 bg-gradient-to-br from-lpg-900 via-lpg-800 to-graphite p-6 text-white sm:p-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-lpg-300">IoT Safety & Telemetry</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Terms & Conditions</h1>
        <p className="mt-2 text-sm text-white/80">Terms of service and safety operating guidelines for Smart LPG Dock.</p>
      </div>

      <div className="flex items-center justify-between px-1 text-xs text-graphite-muted">
        <span>Last Updated: October 6, 2026</span>
        <span>Version 1.0.0 · Smart LPG Safety Dock</span>
      </div>

      <div className="space-y-6 rounded-xl2 border border-line bg-white p-6 sm:p-8 text-sm leading-relaxed text-graphite">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-graphite">1. Product Classification & Safety Disclaimer</h2>
          <p>
            Smart LPG Dock is an advanced IoT safety monitoring and decision-support system. While equipped with automated solenoid cutoff logic and multi-sensor gas leak detection algorithms, it is designed as an auxiliary safety layer and does NOT replace standard certified gas regulators, regular pipeline inspections, or certified municipal fire safety protocols.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-graphite">2. Prototype & Simulated Telemetry</h2>
          <p>
            In demonstration and pitch environments, the web application incorporates a high-fidelity 60Hz physics and telemetry simulator. Simulated leak spikes and emergency alarms are intended for demonstration and training purposes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-graphite">3. User Responsibilities</h2>
          <p>Operators and household users agree to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Ensure proper hardware calibration of load-cell sensors based on cylinder tare weight specifications.</li>
            <li>Maintain clear emergency contact details for automated SOS SMS and buzzer dispatches.</li>
            <li>Follow official safety guidelines during any detected gas leakage, including manual cylinder valve closure and room ventilation.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-graphite">4. Limitation of Liability</h2>
          <p>
            The developers of Smart LPG Dock disclaim all liability for damages, fires, or mechanical gas failures resulting from faulty third-party cylinder equipment, improper installation, or hardware power outages.
          </p>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4 font-bold">
          <button onClick={() => go('privacy')} className="text-lpg-600 hover:underline">
            View Privacy Policy →
          </button>
          <button onClick={() => go('dashboard')} className="text-graphite hover:underline">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
