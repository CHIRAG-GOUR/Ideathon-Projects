'use client';

import React from 'react';
import { create } from 'zustand';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, WifiOff } from 'lucide-react';

type Tone = 'success' | 'info' | 'offline';
interface ToastItem {
  id: number;
  text: string;
  tone: Tone;
}

const useToasts = create<{ items: ToastItem[]; push: (text: string, tone?: Tone) => void; drop: (id: number) => void }>((set, get) => ({
  items: [],
  push: (text, tone = 'success') => {
    const id = Date.now() + Math.random();
    set({ items: [...get().items.slice(-2), { id, text, tone }] });
    setTimeout(() => get().drop(id), 2600);
  },
  drop: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}));

export const toast = (text: string, tone?: Tone) => useToasts.getState().push(text, tone);

export function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[90] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-ink shadow-lift ring-1 ring-cloud-300"
            role="status"
          >
            {t.tone === 'success' ? (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.05 }}>
                <CheckCircle2 className="h-5 w-5 text-aqua-500" />
              </motion.span>
            ) : t.tone === 'offline' ? (
              <WifiOff className="h-5 w-5 text-lemon-500" />
            ) : (
              <Info className="h-5 w-5 text-lilac-500" />
            )}
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
