'use client';

import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

/** Mobile bottom sheet / desktop dialog. Escape closes, focus moves inside. */
export function BottomSheet({ open, onClose, title, children, testId }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; testId?: string }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => panel.current?.focus(), 50);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title} data-testid={testId}>
          <motion.div className="absolute inset-0 bg-[#8C94B8]/25 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={panel}
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] bg-cloud-50 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-lift outline-none sm:max-w-lg sm:rounded-[28px]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-cloud-50/95 px-5 pb-2 pt-3 backdrop-blur">
              <span className="absolute left-1/2 top-2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-cloud-300 sm:hidden" />
              <h2 className="pt-3 text-lg font-extrabold text-ink">{title}</h2>
              <button onClick={onClose} className="btn btn-ghost mt-2 h-10 min-h-0 w-10 p-0" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 pb-2">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
