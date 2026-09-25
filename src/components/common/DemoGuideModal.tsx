'use client';

import React from 'react';
import Link from 'next/link';
import { useGroceryStore } from '@/lib/store';
import {
  X,
  ScanLine,
  CheckCircle2,
  Printer,
  Sparkles,
  Trophy,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const DemoGuideModal: React.FC = () => {
  const { showDemoGuide, toggleDemoGuide, resetDemo } = useGroceryStore();

  if (!showDemoGuide) return null;

  const STEPS = [
    {
      num: '1',
      title: 'Pick a Physical Product',
      desc: 'Take a sample object (e.g. a bottle with the Milk barcode or a box with the Bread barcode).',
      badge: 'Step 1',
    },
    {
      num: '2',
      title: 'Open Scanner & Scan',
      desc: 'Point the webcam or phone camera at the barcode label. The app instantly recognizes the item.',
      badge: 'Step 2',
    },
    {
      num: '3',
      title: 'Read Expiry & Urgency',
      desc: 'The app shows the shelf life: e.g. "Milk expires in 2 days → SELL FIRST 🔴".',
      badge: 'Step 3',
    },
    {
      num: '4',
      title: 'Arrange Into the Shelf',
      desc: 'Click "Arrange Product" and place it on the recommended shelf (SELL FIRST, SELL SOON, or FRESH).',
      badge: 'Step 4',
    },
    {
      num: '5',
      title: 'Score Points & Prevent Waste',
      desc: 'Earn +50 points per scan, +100 for correct shelf placement, and +500 for organizing all 6 items!',
      badge: 'Step 5',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={toggleDemoGuide}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
      />

      {/* Modal Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E8DFC9] p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-base">
              💡
            </div>
            <div>
              <h3 className="font-display font-black text-base text-gray-900">
                School Project Demonstration Guide
              </h3>
              <p className="text-[11px] text-gray-500">How to present this project to teachers & judges</p>
            </div>
          </div>
          <button
            onClick={toggleDemoGuide}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps Flow */}
        <div className="space-y-2.5">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className="p-3 rounded-2xl bg-cream-50 border border-cardboard-200 flex items-start gap-3"
            >
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                {s.num}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900">{s.title}</p>
                <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Print Barcodes link */}
        <div className="mt-5 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold text-emerald-950">
              Need physical barcodes?
            </span>
          </div>
          <Link
            href="/barcodes"
            onClick={toggleDemoGuide}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            Print Barcode Sheet
          </Link>
        </div>

        {/* Close Button */}
        <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => {
              resetDemo();
              toggleDemoGuide();
            }}
            className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>

          <button
            onClick={toggleDemoGuide}
            className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold shadow-sm"
          >
            Got It!
          </button>
        </div>
      </motion.div>
    </div>
  );
};
