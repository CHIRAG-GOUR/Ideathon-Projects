import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-emerald-950 text-emerald-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-teal-900 via-emerald-900 to-slate-900 border border-emerald-700/50 p-6 sm:p-8">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-emerald-400">AI Nutrition & Allergen Intelligence</span>
          <h1 className="mt-2 text-3xl font-black text-white">Nutri Scan · Privacy Policy</h1>
          <p className="mt-2 text-sm text-emerald-200">How Nutri Scan handles food barcode scans, dietary preferences, and allergen profiles.</p>
        </div>

        <div className="rounded-2xl border border-emerald-800 bg-emerald-900/60 p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-emerald-100">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Barcode & OCR Ingredient Scanning</h2>
            <p>
              Nutri Scan processes camera frames solely to identify UPC/EAN barcodes and extract ingredient label text. Images of packaged goods are not stored permanently after text recognition completes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Dietary Preferences & Health Goals</h2>
            <p>
              Your saved allergen sensitivities (gluten, nuts, lactose, vegan, keto) are stored locally in your browser to personalize food suitability scores and are never sold to food advertisers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Contact Support</h2>
            <p className="font-mono text-xs text-emerald-300">Email: support@nutriscan.ai · Live Web App: https://nutri-scan-ideathon.web.app</p>
          </section>

          <div className="flex items-center justify-between border-t border-emerald-800 pt-4 text-emerald-300 font-bold">
            <Link href="/terms" className="hover:underline">Terms & Conditions →</Link>
            <Link href="/" className="text-emerald-200 hover:text-white hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
