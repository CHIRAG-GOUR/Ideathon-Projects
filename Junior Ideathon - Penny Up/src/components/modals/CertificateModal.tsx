import React from 'react';
import { X, Printer, Award, Sparkles, CheckCircle2 } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { formatRupee } from '../../lib/utils';

export const CertificateModal: React.FC = () => {
  const { certificateGoal, setCertificateGoal } = useSavingsStore();

  if (!certificateGoal) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-coin-bright max-h-[95vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => setCertificateGoal(null)}
          className="absolute top-4 right-4 p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-cloud-200 transition-colors cursor-pointer"
          title="Close certificate"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Certificate Printable Canvas */}
        <div className="border-2 border-dashed border-coin/60 rounded-2xl p-6 sm:p-8 text-center bg-gradient-to-b from-amber-50/50 via-white to-emerald-50/40 print:border-none print:p-0">
          {/* Top Seal Badge */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-coin to-coin-bright text-white mx-auto flex items-center justify-center shadow-lg shadow-coin/30 text-3xl mb-3">
            🏆
          </div>

          <span className="chip-tag bg-coin-soft text-coin-dark border border-coin-border text-xs uppercase tracking-widest font-black mb-2">
            PennyPup Official Award
          </span>

          <h2 className="text-2xl sm:text-3xl font-black text-ink tracking-tight mt-1 mb-1">
            Certificate of Savings Champion
          </h2>

          <p className="text-xs sm:text-sm text-ink-muted font-semibold max-w-sm mx-auto mb-6">
            This certifies that an awesome young saver achieved their big dream through patience and discipline!
          </p>

          <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-4 sm:p-5 border border-cloud-300 shadow-xs max-w-md mx-auto my-4">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Presented to</p>
            <h3 className="text-xl sm:text-2xl font-black text-brand-dark my-1">
              ⭐ Little Saver ⭐
            </h3>
            <p className="text-xs text-ink-muted mt-2">
              For successfully saving <span className="font-black text-ink">{formatRupee(certificateGoal.saved_amount)}</span> to achieve:
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-soft border border-brand-border text-brand-dark font-black text-base mt-2">
              <span>{certificateGoal.emoji}</span>
              <span>{certificateGoal.title}</span>
            </div>
          </div>

          {/* Footer Signatures */}
          <div className="flex items-center justify-between pt-6 border-t border-coin-border/60 max-w-md mx-auto text-left">
            <div>
              <p className="text-[10px] font-bold text-ink-muted uppercase">Verified By</p>
              <p className="text-xs font-black text-ink flex items-center gap-1">
                <span>🐶 PennyPup Mascot</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-ink-muted uppercase">Date Achieved</p>
              <p className="text-xs font-black text-ink">
                {new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-6 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 btn-primary py-3 text-sm"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Print or Save Certificate</span>
          </button>
          <button
            onClick={() => setCertificateGoal(null)}
            className="btn-secondary py-3 text-sm px-6"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
