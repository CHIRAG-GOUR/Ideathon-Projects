'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGroceryStore } from '@/lib/store';
import { DemoProduct } from '@/lib/products';
import {
  Boxes,
  ScanLine,
  Warehouse,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Tag,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MyStockPage() {
  const router = useRouter();
  const { products, setSelectedProductId } = useGroceryStore();
  const [selectedProduct, setLocalSelectedProduct] = useState<DemoProduct | null>(null);

  const handleArrange = (p: DemoProduct) => {
    setSelectedProductId(p.id);
    router.push('/warehouse');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-black text-2xl sm:text-3xl text-gray-900 tracking-tight">
              My Stock 📦
            </h1>
            <span className="text-xs uppercase font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              6 Products
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Color-coded inventory overview organized by expiry priority
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-tomato-100 text-tomato-800">
            🔴 Sell First (&le;2d)
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800">
            🟡 Sell Soon (3-7d)
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800">
            🟢 Fresh (&gt;7d)
          </span>
        </div>
      </div>

      {/* 6 Clean Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map((p) => {
          const isSellFirst = p.idealZone === 'SELL_FIRST';
          const isSellSoon = p.idealZone === 'SELL_SOON';

          return (
            <motion.div
              key={p.id}
              whileHover={{ y: -4 }}
              onClick={() => setLocalSelectedProduct(p)}
              className={`p-5 sm:p-6 rounded-3xl bg-white border transition-all cursor-pointer shadow-warm-sm hover:shadow-warm-md flex flex-col justify-between ${
                isSellFirst
                  ? 'border-tomato-300 ring-1 ring-tomato-500/15'
                  : isSellSoon
                  ? 'border-amber-300'
                  : 'border-emerald-200'
              }`}
            >
              <div>
                {/* Card Top: Category & Expiry Badge */}
                <div className="flex items-center justify-between gap-1 mb-3">
                  <span className="text-[10px] font-bold text-gray-500 bg-cream-100 px-2 py-0.5 rounded uppercase">
                    {p.category}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      isSellFirst
                        ? 'bg-tomato-100 text-tomato-800 animate-pulse'
                        : isSellSoon
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isSellFirst ? '🔴 Sell First' : isSellSoon ? '🟡 Sell Soon' : '🟢 Fresh'}
                  </span>
                </div>

                {/* Product Graphic + Name */}
                <div className="flex items-center gap-3.5 my-2">
                  <div className="w-14 h-14 rounded-2xl bg-[#FAF8F4] border border-[#E8DFC8] flex items-center justify-center text-3xl flex-shrink-0">
                    {p.emoji}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-gray-900 leading-snug">
                      {p.name}
                    </h3>
                    <p className="text-xs text-gray-500">{p.unit}</p>
                  </div>
                </div>

                {/* Shelf Life & Units */}
                <div className="mt-4 p-3 rounded-2xl bg-[#FAF8F4] border border-cardboard-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Quantity:</span>
                    <span className="font-bold text-gray-900">{p.quantity} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Expiry:</span>
                    <span
                      className={`font-bold ${
                        isSellFirst ? 'text-tomato-600' : isSellSoon ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {p.shelfLifeText}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Current Status:</span>
                    <span className="font-bold text-emerald-800">
                      {p.placedCorrectly ? '✓ Correctly Placed' : p.scanned ? 'Scanned' : 'Not Scanned'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Link */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArrange(p);
                  }}
                  className="w-full py-2 rounded-xl bg-grocery-700 hover:bg-grocery-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Warehouse className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Arrange in Warehouse</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLocalSelectedProduct(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl border border-[#E8DFC9] p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedProduct.emoji}</span>
                <div>
                  <h3 className="font-display font-black text-xl text-gray-900">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-xs text-gray-500">{selectedProduct.category} • Barcode: {selectedProduct.barcode}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-cream-50 border border-cardboard-200 text-xs space-y-1.5">
                <p><strong>Expiry:</strong> {selectedProduct.shelfLifeText}</p>
                <p><strong>Recommended Shelf:</strong> {selectedProduct.idealZone.replace('_', ' ')}</p>
                <p><strong>Guidance:</strong> {selectedProduct.tip}</p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => setLocalSelectedProduct(null)}
                  className="flex-1 py-2.5 rounded-xl border border-cardboard-200 text-gray-700 text-xs font-bold"
                >
                  Close
                </button>
                <button
                  onClick={() => handleArrange(selectedProduct)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  Arrange Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
