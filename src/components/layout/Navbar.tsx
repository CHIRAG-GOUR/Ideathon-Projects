'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGroceryStore } from '@/lib/store';
import {
  Store,
  ScanLine,
  Boxes,
  Warehouse,
  Printer,
  Sparkles,
  RotateCcw,
  HelpCircle,
  Star,
} from 'lucide-react';
import { playSuccessChime } from '@/lib/sound';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { points, resetDemo, toggleDemoGuide, products } = useGroceryStore();

  const navItems = [
    { name: 'Home', href: '/', icon: Store },
    { name: 'Scan', href: '/scan', icon: ScanLine, highlight: true },
    { name: 'My Stock', href: '/stock', icon: Boxes },
    { name: 'Warehouse', href: '/warehouse', icon: Warehouse },
  ];

  const scannedCount = products.filter((p) => p.scanned).length;

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F4]/95 backdrop-blur-md border-b border-[#EAE2D2] px-4 sm:px-8 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform text-xl">
            🥬
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-black text-xl tracking-tight text-gray-900">
                Visionary <span className="text-emerald-600">X</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                School Demo
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium hidden sm:block">
              Smart Grocery Assistant
            </p>
          </div>
        </Link>

        {/* 4 Main Nav Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2 bg-white/80 p-1 rounded-2xl border border-cardboard-200 shadow-warm-sm">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? item.highlight
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-grocery-700 text-white shadow-sm'
                    : item.highlight
                    ? 'text-emerald-700 hover:bg-emerald-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-cream-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Controls: Points, Barcodes, Reset */}
        <div className="flex items-center gap-2">
          {/* Points Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black shadow-xs">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{points} pts</span>
          </div>

          {/* Print Barcodes Button */}
          <Link
            href="/barcodes"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-cardboard-200 text-gray-700 hover:text-gray-900 hover:border-cardboard-400 text-xs font-bold shadow-warm-sm transition-colors"
            title="Print Demo Barcodes"
          >
            <Printer className="w-3.5 h-3.5 text-grocery-700" />
            <span>Print Barcodes</span>
          </Link>

          {/* Reset Demo Button */}
          <button
            onClick={() => {
              playSuccessChime();
              resetDemo();
            }}
            className="p-2 rounded-xl bg-cream-100 hover:bg-cream-200 border border-cardboard-200 text-gray-600 hover:text-gray-900 transition-colors"
            title="Reset Demo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Demo Help Button */}
          <button
            onClick={toggleDemoGuide}
            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 transition-colors"
            title="How to Demonstrate"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
