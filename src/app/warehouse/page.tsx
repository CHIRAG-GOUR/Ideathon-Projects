'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import confetti from 'canvas-confetti';
import { useGroceryStore } from '@/lib/store';
import { ShelfZone, DemoProduct } from '@/lib/products';
import { playScanBeep, playSuccessChime, playWarningBuzz, playCelebrateFanfare } from '@/lib/sound';
import {
  Warehouse,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Star,
  Gamepad2,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamic import for 3D view
const SimpleWarehouse3D = dynamic(
  () => import('@/components/warehouse/SimpleWarehouse3D').then((m) => m.SimpleWarehouse3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[450px] flex items-center justify-center bg-[#FAF7F0] rounded-3xl border border-[#E8DFC8] text-gray-500 text-xs">
        Loading 3D Warehouse View...
      </div>
    ),
  }
);

interface ShelfDefinition {
  id: ShelfZone;
  title: string;
  subtitle: string;
  badge: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  color: string;
}

const SHELVES: ShelfDefinition[] = [
  {
    id: 'SELL_FIRST',
    title: 'SELL FIRST SHELF',
    subtitle: 'Expires within 2 days (Urgent)',
    badge: '🔴 Sell First',
    bgClass: 'bg-gradient-to-br from-red-50 to-amber-50/50',
    borderClass: 'border-2 border-tomato-400 shadow-warm-md',
    badgeClass: 'bg-tomato-600 text-white font-bold',
    color: '#E63946',
  },
  {
    id: 'SELL_SOON',
    title: 'SELL SOON SHELF',
    subtitle: 'Expires in 3 – 7 days (Watch)',
    badge: '🟡 Sell Soon',
    bgClass: 'bg-amber-50/50',
    borderClass: 'border-2 border-amber-300 shadow-warm-sm',
    badgeClass: 'bg-amber-500 text-white font-bold',
    color: '#F59E0B',
  },
  {
    id: 'FRESH',
    title: 'FRESH STORAGE',
    subtitle: 'Expires in >7 days (Safe Pantry)',
    badge: '🟢 Fresh',
    bgClass: 'bg-emerald-50/40',
    borderClass: 'border-2 border-emerald-400 shadow-warm-sm',
    badgeClass: 'bg-emerald-600 text-white font-bold',
    color: '#2D6A4F',
  },
];

export default function WarehousePage() {
  const {
    products,
    points,
    selectedProductId,
    setSelectedProductId,
    arrangeProductToZone,
    resetDemo,
  } = useGroceryStore();

  const [activeTab, setActiveTab] = useState<'2D' | '3D'>('2D');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'warning'; message: string; points?: number } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const allOrganized = products.every((p) => p.placedCorrectly);

  // Trigger celebration when all 6 products are organized
  useEffect(() => {
    if (allOrganized && !showCelebration) {
      playCelebrateFanfare();
      setShowCelebration(true);
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#2D6A4F', '#52B788', '#F59E0B', '#E63946', '#3A86FF'],
        });
      } catch {
        // Fallback
      }
    }
  }, [allOrganized]);

  const handleShelfClick = (zoneId: ShelfZone) => {
    if (!selectedProduct) return;

    const res = arrangeProductToZone(selectedProduct.id, zoneId);

    if (res.correct) {
      playSuccessChime();
      setFeedback({
        type: 'success',
        message: res.message,
        points: res.pointsEarned,
      });
      // Move selection to next unorganized product
      const nextUnorganized = products.find((p) => p.id !== selectedProduct.id && !p.placedCorrectly);
      setSelectedProductId(nextUnorganized ? nextUnorganized.id : null);
    } else {
      playWarningBuzz();
      setFeedback({
        type: 'warning',
        message: res.message,
      });
    }

    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-black text-2xl sm:text-3xl text-gray-900 tracking-tight">
              Warehouse Organization 🏬
            </h1>
            <span className="text-xs uppercase font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Interactive Game
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Drag or select products to place them into the correct freshness shelf
          </p>
        </div>

        {/* 2D / 3D Toggle */}
        <div className="flex items-center p-1 rounded-2xl bg-cream-100 border border-cardboard-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('2D')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === '2D'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            📋 2D Shelves
          </button>
          <button
            onClick={() => setActiveTab('3D')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === '3D'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>3D Room</span>
          </button>
        </div>
      </div>

      {/* Real-time Feedback Banner */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-md ${
              feedback.type === 'success'
                ? 'bg-emerald-700 text-white border-emerald-600'
                : 'bg-amber-600 text-white border-amber-500'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-200 flex-shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            {feedback.points && feedback.points > 0 && (
              <span className="bg-white/20 px-2.5 py-0.5 rounded-lg text-amber-200 font-black">
                +{feedback.points} pts
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Selected Product Banner */}
      <div className="p-4 rounded-3xl bg-white border border-[#E8DFC8] shadow-warm-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cream-100 flex items-center justify-center text-3xl">
            {selectedProduct ? selectedProduct.emoji : '📦'}
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400">
              Selected Item to Arrange:
            </span>
            <h3 className="font-display font-bold text-base text-gray-900">
              {selectedProduct ? selectedProduct.name : 'Select a product below'}
            </h3>
            {selectedProduct && (
              <p className="text-xs text-tomato-700 font-semibold">
                {selectedProduct.shelfLifeText} • Destination: <strong>{selectedProduct.idealZone.replace('_', ' ')}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Quick select buttons for unplaced items */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProductId(p.id)}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                selectedProductId === p.id
                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/20'
                  : p.placedCorrectly
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 opacity-60'
                  : 'bg-cream-50 border border-cardboard-200 text-gray-700 hover:bg-cream-100'
              }`}
            >
              <span>{p.emoji}</span>
              <span>{p.name}</span>
              {p.placedCorrectly && <span>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* 2D INTERACTIVE SHELVES VIEW */}
      {activeTab === '2D' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SHELVES.map((shelf) => {
            const shelfProducts = products.filter((p) => p.currentZone === shelf.id);

            return (
              <div
                key={shelf.id}
                onClick={() => handleShelfClick(shelf.id)}
                className={`rounded-3xl p-5 sm:p-6 ${shelf.bgClass} ${shelf.borderClass} flex flex-col justify-between min-h-[420px] transition-all cursor-pointer group hover:shadow-warm-lg hover:-translate-y-1 relative`}
              >
                <div>
                  {/* Shelf Header */}
                  <div className="flex items-start justify-between pb-3 mb-4 border-b border-black/5">
                    <div>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider ${shelf.badgeClass}`}>
                        {shelf.badge}
                      </span>
                      <h3 className="font-display font-black text-lg text-gray-900 mt-1.5">
                        {shelf.title}
                      </h3>
                      <p className="text-xs text-gray-600 mt-0.5 font-medium">
                        {shelf.subtitle}
                      </p>
                    </div>

                    <span className="text-xs font-bold text-gray-500 font-mono bg-white/80 px-2 py-1 rounded-xl">
                      {shelfProducts.length} items
                    </span>
                  </div>

                  {/* Items Placed on this Shelf */}
                  <div className="space-y-2.5">
                    {shelfProducts.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-2xl bg-white border border-black/5 shadow-warm-sm flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{p.emoji}</span>
                          <div>
                            <p className="font-bold text-xs text-gray-900">{p.name}</p>
                            <p className="text-[10px] text-gray-500">
                              {p.quantity} units • {p.shelfLifeText}
                            </p>
                          </div>
                        </div>
                        <span className="text-emerald-700 font-bold text-xs">✓ Placed</span>
                      </div>
                    ))}

                    {shelfProducts.length === 0 && (
                      <div className="py-16 text-center text-gray-400 text-xs">
                        <p className="font-medium">Shelf is currently empty.</p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Click here to place {selectedProduct ? selectedProduct.name : 'a product'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shelf Placement Button Prompt */}
                {selectedProduct && (
                  <div className="pt-4 border-t border-black/5 mt-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShelfClick(shelf.id);
                      }}
                      className="w-full py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                    >
                      Place {selectedProduct.name} Here ⬇
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3D INTERACTIVE WAREHOUSE VIEW */}
      {activeTab === '3D' && (
        <SimpleWarehouse3D
          selectedProductId={selectedProductId}
          onSelectProduct={(id) => setSelectedProductId(id)}
          onPlaceInShelf={(zone) => handleShelfClick(zone)}
        />
      )}

      {/* CELEBRATION MODAL ON ALL 6 COMPLETED */}
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E8DFC9] p-6 sm:p-8 shadow-2xl z-10 text-center space-y-6"
            >
              <div>
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-200 text-amber-900 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-400/20 text-3xl">
                  🏆
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Mission Accomplished
                </span>
                <h2 className="font-display font-black text-3xl text-gray-900 mt-2 tracking-tight">
                  🎉 Store Organized!
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  You successfully organized all 6 products into their correct freshness shelves!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left text-xs">
                <div className="p-3.5 rounded-2xl bg-cream-50 border border-cardboard-200">
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Total Score</span>
                  <span className="text-xl font-black text-gray-900 mt-0.5 block font-mono">
                    ⭐ {points} pts
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">+500 completion bonus</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-800 text-[10px] uppercase font-bold block">Waste Prevented</span>
                  <span className="text-xl font-black text-emerald-800 mt-0.5 block font-mono">
                    ₹1,250
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">100% Food Saved</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-bold">
                GREAT JOB! Your grocery store is ready for the day.
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => {
                    resetDemo();
                    setShowCelebration(false);
                  }}
                  className="flex-1 py-3 rounded-2xl border border-cardboard-200 text-gray-700 hover:bg-cream-100 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Demonstrate Again</span>
                </button>

                <Link
                  href="/"
                  onClick={() => setShowCelebration(false)}
                  className="flex-1 py-3 rounded-2xl bg-gray-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <span>Return to Home</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
