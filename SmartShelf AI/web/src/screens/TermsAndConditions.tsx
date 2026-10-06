import { Link } from 'react-router-dom';
import { Card } from '../ui/kit';
import { PageBanner } from '../ui/page';
import { Logo } from '../ui/icons';

export default function TermsAndConditions() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageBanner
        kicker="Legal & Compliance"
        title="Terms & Conditions"
        sub="Terms of Service governing your use of SmartShelf AI web platform, 3D simulator, and mobile app."
        tone="deep"
      />

      <div className="flex items-center justify-between text-[13px] text-ink-muted px-1">
        <span>Last Updated: October 6, 2026</span>
        <span>Version 1.0.0 · SmartShelf AI by Beyond Legacy</span>
      </div>

      <Card className="p-6 md:p-8 space-y-6 text-[14.5px] leading-relaxed text-ink-2">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <Logo size={36} />
          <div>
            <h2 className="font-display text-lg font-extrabold text-ink">Terms of Service & Usage Agreement</h2>
            <p className="text-xs text-ink-muted">SmartShelf AI Platform</p>
          </div>
        </div>

        <section className="space-y-2">
          <h3 className="font-display text-base font-bold text-ink">1. Acceptance of Terms</h3>
          <p>
            By accessing or using SmartShelf AI (&quot;the Service&quot;), including our web application, Android companion application, and 3D Shelf Rush simulation environment, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please discontinue use of the platform.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-display text-base font-bold text-ink">2. Nature of Prescriptive Analytics & Decision Support</h3>
          <p>
            SmartShelf AI provides automated heuristic demand calculations, safety-stock models, and restock recommendations based upon user-provided stock counts and sales logs.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-[14px]">
            <li><strong>Decision Support Only:</strong> All algorithmic outputs, order quantities, and discount prompts are provided solely as decision support. Store managers retain sole responsibility for final purchasing decisions, vendor contracts, product pricing, and food safety/perishable handling compliance.</li>
            <li><strong>3D Simulation & Gamified Mode:</strong> The &quot;Shelf Rush&quot; simulation and festival week scenarios are designed for demonstration, stress-testing, and strategy evaluation. Simulation results do not constitute financial guarantees of future retail earnings.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="font-display text-base font-bold text-ink">3. User Obligations & Account Security</h3>
          <p>You agree to:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-[14px]">
            <li>Provide accurate inventory quantities, unit pricing, and batch expiration dates for proper algorithmic analysis.</li>
            <li>Maintain the confidentiality of your workspace login credentials.</li>
            <li>Refrain from reverse-engineering, decompiling, or scraping proprietary simulation models and recommendation engines without explicit authorization.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="font-display text-base font-bold text-ink">4. Intellectual Property Rights</h3>
          <p>
            All visual designs, 3D retail meshes, algorithmic rule-sets, logos, trademarks, and documentation comprising SmartShelf AI and Beyond Legacy are the exclusive intellectual property of the Beyond Legacy project. Your retail data remains 100% your proprietary property.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-display text-base font-bold text-ink">5. Disclaimer of Warranties & Limitation of Liability</h3>
          <p>
            SmartShelf AI is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. To the maximum extent permitted by applicable law, Beyond Legacy disclaims all warranties, express or implied. We shall not be liable for any indirect, incidental, or consequential damages resulting from inventory stock-outs, spoiled perishables, supplier delays, or business interruptions.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-display text-base font-bold text-ink">6. Governing Law & Modifications</h3>
          <p>
            These terms shall be governed by and construed in accordance with applicable commercial and technology laws. We reserve the right to update these terms as new simulation algorithms or features are deployed.
          </p>
        </section>

        <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-4">
          <Link to="/privacy" className="text-[13.5px] font-bold text-green-mid hover:underline">
            View Privacy Policy →
          </Link>
          <Link to="/settings" className="text-[13.5px] font-bold text-ink hover:underline">
            ← Back to Store Settings
          </Link>
        </div>
      </Card>
    </div>
  );
}
