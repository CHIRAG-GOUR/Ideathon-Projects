import { Link } from 'react-router-dom';
import { Card } from '../ui/kit';
import { PageBanner } from '../ui/page';
import { Logo } from '../ui/icons';

export default function PrivacyPolicy() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageBanner
        kicker="Legal & Transparency"
        title="Privacy Policy"
        sub="How SmartShelf AI collects, protects, and processes retail inventory and sales analytics data."
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
            <h2 className="font-display text-lg font-extrabold text-ink">SmartShelf AI Privacy Statement</h2>
            <p className="text-xs text-ink-muted">Autonomous Retail Inventory Intelligence Platform</p>
          </div>
        </div>

        <section className="space-y-2">
          <h3 className="font-display text-base font-bold text-ink">1. Introduction & Scope</h3>
          <p>
            SmartShelf AI (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), operated under the Beyond Legacy portfolio, values the confidentiality of store owners, managers, and operational teams. This Privacy Policy governs our web application (https://beyond-legacy-app.web.app), companion Android mobile application, 3D Shelf Rush simulation engine, and related services.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-display text-base font-bold text-ink">2. Information We Collect</h3>
          <p>We process the following categories of information to deliver automated restock and expiry prevention analytics:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-[14px]">
            <li><strong>Store Metadata:</strong> Store name, operational category (convenience, grocery, supermarket), store area, and custom inventory risk thresholds.</li>
            <li><strong>Inventory Ledgers:</strong> SKU codes, barcodes (EAN/UPC), product titles, shelf categories, unit purchase costs, selling prices, current stock counts, safety stock minimums, supplier contact notes, and batch expiry dates.</li>
            <li><strong>Sales & Movement Velocity:</strong> Historical transaction volumes, logged shrink/wastage, and incoming purchase receipt logs.</li>
            <li><strong>Authentication & Profile:</strong> Encrypted login credentials and workspace IDs managed securely via Google Firebase Authentication (or stored strictly in device localStorage when operating in guest/offline mode).</li>
            <li><strong>Device Diagnostics:</strong> Browser user agent, screen resolution, and WebGL telemetry strictly utilized to optimize 3D store scene rendering and performance.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="font-display text-base font-bold text-ink">3. Purpose & Legal Basis of Processing</h3>
          <p>Your data is processed strictly to provide deterministic retail management services, including:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-[14px]">
            <li>Computing 7-day trailing velocity to alert store owners of imminent stock-out risks.</li>
            <li>Tracking perishable product expiration windows to recommend timely promotional markdowns.</li>
            <li>Optimizing supplier reorder quantities with automated case-size rounding rules.</li>
            <li>Simulating footfall dynamics and customer purchase paths in the 3D Shelf Rush simulator without transmitting live customer identifiable data.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="font-display text-base font-bold text-ink">4. Data Storage, Security & Isolation</h3>
          <p>
            All authenticated workspace data transmitted to the cloud is encrypted in transit using TLS 1.3 and at rest via Google Firebase Cloud Firestore with tenant-level security rules. In offline/demo mode, data resides entirely within your local browser sandbox (IndexedDB/localStorage) and never leaves your device. We do not sell, license, or market your commercial transaction data to external advertising aggregators.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-display text-base font-bold text-ink">5. User Rights & Data Portability</h3>
          <p>
            You maintain total ownership of your retail catalog. You can export complete CSV spreadsheets of your inventory, purge demo datasets, or execute complete device resets at any time directly through the Settings screen.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-display text-base font-bold text-ink">6. Contact & Privacy Inquiries</h3>
          <p>If you have any questions or requests regarding your data, please contact:</p>
          <div className="rounded-xl bg-canvas p-4 text-xs font-mono space-y-1">
            <p><strong>SmartShelf AI Privacy & Governance Team</strong></p>
            <p>Beyond Legacy Project Division</p>
            <p>Email: privacy@beyondlegacy.ai</p>
            <p>Live Web App: https://beyond-legacy-app.web.app</p>
          </div>
        </section>

        <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-4">
          <Link to="/terms" className="text-[13.5px] font-bold text-green-mid hover:underline">
            View Terms & Conditions →
          </Link>
          <Link to="/settings" className="text-[13.5px] font-bold text-ink hover:underline">
            ← Back to Store Settings
          </Link>
        </div>
      </Card>
    </div>
  );
}
