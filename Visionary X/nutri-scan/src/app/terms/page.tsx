import Link from 'next/link';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-emerald-950 text-emerald-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-teal-900 via-emerald-900 to-slate-900 border border-emerald-700/50 p-6 sm:p-8">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-emerald-400">AI Nutrition & Allergen Intelligence</span>
          <h1 className="mt-2 text-3xl font-black text-white">Nutri Scan · Terms & Conditions</h1>
          <p className="mt-2 text-sm text-emerald-200">Dietary analysis disclaimers, medical non-substitution notice, and terms of use.</p>
        </div>

        <div className="rounded-2xl border border-emerald-800 bg-emerald-900/60 p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-emerald-100">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Medical Non-Substitution Notice</h2>
            <p>
              Nutri Scan provides AI-assisted food ingredient analysis for educational and dietary guidance. Nutri Scan does NOT provide medical advice, diagnosis, or treatment. Users with severe medical allergies must always inspect physical manufacturer packaging and consult registered healthcare professionals.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Ingredient Database Accuracy</h2>
            <p>
              While Nutri Scan strives for high accuracy using public nutrition databases and OCR models, product formulations may change without notice. We disclaim liability for manufacturer formulation variations.
            </p>
          </section>

          <div className="flex items-center justify-between border-t border-emerald-800 pt-4 text-emerald-300 font-bold">
            <Link href="/privacy" className="hover:underline">Privacy Policy →</Link>
            <Link href="/" className="text-emerald-200 hover:text-white hover:underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
