'use client';

import React from 'react';
import Link from 'next/link';
import { useGroceryStore } from '@/lib/store';
import {
  ScanLine,
  Boxes,
  Warehouse,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Star,
  Printer,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomePage() {
  const { products, points, toggleDemoGuide } = useGroceryStore();

  const scannedCount = products.filter((p) => p.scanned).length;
  const organizedCount = products.filter((p) => p.placedCorrectly).length;
  const needsAttentionCount = products.filter(
    (p) => p.idealZone === 'SELL_FIRST' || p.idealZone === 'SELL_SOON'
  ).length;

  const allCompleted = organizedCount === products.length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Banner Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-gray-900 tracking-tight">
            Good Morning! 👋
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 font-medium">
            Let&apos;s organize today&apos;s stock and prevent food waste.
          </p>
        </div>

        {/* Demo Guide Pill */}
        <button
          onClick={toggleDemoGuide}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold shadow-warm-sm hover:bg-emerald-50 transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-emerald-600" />
          <span>Demo Instructions for Teachers</span>
        </button>
      </div>

      {/* 3 Large Visual Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Scanned Today */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E8DFC8] shadow-warm-sm hover:shadow-warm-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Scanned Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <ScanLine className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-display font-black text-gray-900">
              {scannedCount}
            </span>
            <span className="text-xs text-gray-400 font-semibold">/ {products.length} products</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            {scannedCount === products.length ? '✓ All products scanned!' : `${products.length - scannedCount} products left to scan`}
          </p>
        </div>

        {/* Card 2: Needs Attention */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-tomato-200 shadow-warm-sm hover:shadow-warm-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-tomato-800 uppercase tracking-wider">
              Needs Attention
            </span>
            <div className="w-8 h-8 rounded-xl bg-tomato-100 flex items-center justify-center text-tomato-600 animate-pulse">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-display font-black text-tomato-600">
              {needsAttentionCount}
            </span>
            <span className="text-xs text-tomato-700 font-semibold">items expiring soon</span>
          </div>
          <p className="text-[11px] text-tomato-600 mt-2 font-medium">
            Must be placed in SELL FIRST shelf
          </p>
        </div>

        {/* Card 3: Stock Organized */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-emerald-200 shadow-warm-sm hover:shadow-warm-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Stock Organized
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-display font-black text-emerald-700">
              {organizedCount}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">/ {products.length} shelves</span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-2 font-medium">
            {allCompleted ? '🎉 Perfect! Zero food waste.' : 'Organize items in the warehouse'}
          </p>
        </div>
      </div>

      {/* HUGE Primary Scan CTA Button */}
      <div className="text-center py-2">
        <Link
          href="/scan"
          className="inline-flex items-center justify-center gap-3 w-full max-w-lg px-8 py-5 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-display font-black text-xl sm:text-2xl shadow-xl shadow-emerald-700/25 active:scale-95 transition-all group"
        >
          <ScanLine className="w-7 h-7 text-emerald-200 group-hover:scale-110 transition-transform" />
          <span>📷 SCAN A PRODUCT</span>
          <ArrowRight className="w-6 h-6 text-emerald-300 group-hover:translate-x-1.5 transition-transform" />
        </Link>
      </div>

      {/* Today's Mission Card */}
      <div className="p-6 rounded-3xl bg-white border border-[#E8DFC8] shadow-warm-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Today&apos;s Mission
              </span>
              <h2 className="font-display font-bold text-base text-gray-900">
                Scan 6 products and put them in the correct place.
              </h2>
            </div>
          </div>
          <span className="font-mono font-bold text-sm text-gray-900">
            {organizedCount} / {products.length} completed
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
            style={{ width: `${(organizedCount / products.length) * 100}%` }}
          />
        </div>

        {/* 6 Product Checkmarks Ticker */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-2">
          {products.map((p) => (
            <div
              key={p.id}
              className={`p-2.5 rounded-2xl border text-center transition-all ${
                p.placedCorrectly
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : p.scanned
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-[#FAF8F4] border-cardboard-200 text-gray-600'
              }`}
            >
              <span className="text-2xl block mb-1">{p.emoji}</span>
              <p className="font-bold text-xs truncate">{p.name}</p>
              <p className="text-[10px] opacity-80 mt-0.5">
                {p.placedCorrectly ? '✓ Placed' : p.scanned ? 'Scanned' : 'Not scanned'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Tip & 3-Step Story */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Smart Tip */}
        <div className="p-5 rounded-3xl bg-amber-50/70 border border-amber-200 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-200/80 flex items-center justify-center text-amber-900 flex-shrink-0 text-xl">
            💡
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-amber-950">
              Quick Rule of Thumb
            </h3>
            <p className="text-xs text-amber-900/80 mt-1 leading-relaxed">
              &ldquo;Products that expire sooner should always be placed on the front shelf to be sold first.&rdquo;
            </p>
          </div>
        </div>

        {/* Print Barcodes CTA Card */}
        <div className="p-5 rounded-3xl bg-cream-50 border border-cardboard-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-cardboard-300 flex items-center justify-center text-gray-700 flex-shrink-0">
              <Printer className="w-5 h-5 text-grocery-700" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-gray-900">
                Physical Demo Barcodes
              </h3>
              <p className="text-xs text-gray-500">
                Print 6 machine-readable stickers for physical items
              </p>
            </div>
          </div>
          <Link
            href="/barcodes"
            className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-colors whitespace-nowrap"
          >
            Open Sheet
          </Link>
        </div>
      </div>
    </div>
  );
}
