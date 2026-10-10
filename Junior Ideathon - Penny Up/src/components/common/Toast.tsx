import React from 'react';
import { CheckCircle2, AlertCircle, Info, Sparkles, X } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';

export const Toast: React.FC = () => {
  const { toast, dismissToast } = useSavingsStore();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-mint" />,
    error: <AlertCircle className="w-5 h-5 text-coralberry" />,
    info: <Info className="w-5 h-5 text-skybright" />,
    celebrate: <Sparkles className="w-5 h-5 text-ambercoin animate-bounce" />
  };

  const bgStyles = {
    success: 'bg-white border-mint-border/80 text-ink shadow-soft',
    error: 'bg-white border-coralberry/30 text-ink shadow-soft',
    info: 'bg-white border-skybright/30 text-ink shadow-soft',
    celebrate: 'bg-gradient-to-r from-pup-soft to-ambercoin-soft border-pup/30 text-ink shadow-float'
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md pointer-events-auto transition-all animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={`flex items-start gap-3 p-4 rounded-2xl border shadow-lg ${bgStyles[toast.type]}`}>
        <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink leading-tight">{toast.title}</p>
          <p className="text-xs text-ink-muted mt-0.5">{toast.message}</p>
        </div>
        <button
          onClick={dismissToast}
          className="p-1 rounded-lg text-ink-faint hover:text-ink hover:bg-slate-100 transition-colors"
          aria-label="Close message"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
