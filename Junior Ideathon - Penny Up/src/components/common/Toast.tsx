import React from 'react';
import { CheckCircle2, AlertCircle, Info, Sparkles, X } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';

export const Toast: React.FC = () => {
  const { toast, dismissToast } = useSavingsStore();

  if (!toast) return null;

  const isSuccess = toast.type === 'success' || toast.type === 'celebrate';
  const isError = toast.type === 'error';

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top duration-300">
      <div className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 bg-white ${
        isSuccess ? 'border-brand-border ring-1 ring-brand/20' : isError ? 'border-red-200' : 'border-cloud-300'
      }`}>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${
          isSuccess ? 'bg-brand-soft text-brand-dark' : isError ? 'bg-red-50 text-red-600' : 'bg-cloud-200 text-ink'
        }`}>
          {toast.type === 'celebrate' ? '🎉' : isSuccess ? '✓' : isError ? '⚠️' : 'ℹ️'}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-black text-ink leading-tight">{toast.title}</h4>
          <p className="text-xs text-ink-muted font-medium mt-0.5">{toast.message}</p>
        </div>

        <button
          onClick={dismissToast}
          className="text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-cloud-200 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
