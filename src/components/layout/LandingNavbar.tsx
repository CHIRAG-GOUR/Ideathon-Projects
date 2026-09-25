'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Leaf, ArrowRight, Gamepad2, Sparkles, LayoutDashboard, Menu, X } from 'lucide-react';

export const LandingNavbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#FAF8F4]/90 backdrop-blur-md border-b border-[#EFEAE0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-grocery-600 to-grocery-800 flex items-center justify-center shadow-md shadow-grocery-700/20 group-hover:scale-105 transition-transform">
            <Leaf className="w-5 h-5 text-emerald-300 transform -rotate-12" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-extrabold text-xl tracking-tight text-grocery-900">
                Shelf<span className="text-grocery-500">Pulse</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-grocery-100 text-grocery-700 border border-grocery-200">
                Retail OS
              </span>
            </div>
            <p className="text-[10px] text-cardboard-600 font-medium hidden sm:block">
              Turn Aging Stock Into Smart Decisions
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-700">
          <a href="#how-it-works" className="hover:text-grocery-700 transition-colors">
            How It Works
          </a>
          <a href="#features" className="hover:text-grocery-700 transition-colors">
            Core Features
          </a>
          <a href="#before-after" className="hover:text-grocery-700 transition-colors">
            Before vs After
          </a>
          <a href="#roi-calculator" className="hover:text-grocery-700 transition-colors">
            Waste Calculator
          </a>
          <Link
            href="/simulation"
            className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-semibold px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 transition-all hover:shadow-sm"
          >
            <Gamepad2 className="w-4 h-4 text-emerald-600" />
            <span>3D Simulation</span>
            <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold uppercase">
              Play
            </span>
          </Link>
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-semibold text-gray-700 hover:text-gray-900 px-3 py-2"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-grocery-700 text-white text-xs font-semibold hover:bg-grocery-800 active:scale-95 transition-all shadow-md shadow-grocery-800/15"
          >
            <span>Launch Store OS</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-300" />
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-cream-100"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-[#EBE3D3] px-4 py-4 space-y-3 animate-in fade-in">
          <a
            href="#how-it-works"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-medium text-gray-700"
          >
            How It Works
          </a>
          <a
            href="#features"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-medium text-gray-700"
          >
            Core Features
          </a>
          <a
            href="#before-after"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-medium text-gray-700"
          >
            Before vs After
          </a>
          <a
            href="#roi-calculator"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-medium text-gray-700"
          >
            Waste Calculator
          </a>
          <Link
            href="/simulation"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 text-sm font-bold text-emerald-700 py-1"
          >
            <Gamepad2 className="w-4 h-4" /> 3D Warehouse Simulation Game
          </Link>
          <div className="pt-2 border-t border-gray-100 flex gap-2">
            <Link
              href="/dashboard"
              className="flex-1 text-center py-2.5 rounded-xl bg-grocery-700 text-white text-xs font-bold"
            >
              Open Live Dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
