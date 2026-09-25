import React from 'react';
import Link from 'next/link';
import { Leaf, Heart, ShieldCheck, Sparkles, Store } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="bg-[#F5F0E6] border-t border-[#E8DFC8] pt-14 pb-10 text-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-[#E3D8BE]">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-grocery-700 flex items-center justify-center shadow-md shadow-grocery-700/20">
                <Leaf className="w-5 h-5 text-emerald-300" />
              </div>
              <span className="font-display font-extrabold text-xl text-grocery-900">
                Shelf<span className="text-grocery-500">Pulse</span>
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed max-w-sm">
              The modern grocery store operating system. We empower local shopkeepers and retail marts to eliminate avoidable food waste, rotate stock intelligently, and recover maximum profit.
            </p>
            <div className="flex items-center gap-3 text-xs text-cardboard-700 font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Bank-Grade Privacy
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Store className="w-4 h-4 text-emerald-600" /> Made for Real Kirana Stores
              </span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/dashboard" className="hover:text-grocery-800 transition-colors">
                  Store Dashboard
                </Link>
              </li>
              <li>
                <Link href="/inventory" className="hover:text-grocery-800 transition-colors">
                  Stock Matrix
                </Link>
              </li>
              <li>
                <Link href="/scanner" className="hover:text-grocery-800 transition-colors">
                  Barcode Scanner
                </Link>
              </li>
              <li>
                <Link href="/expiry" className="hover:text-grocery-800 transition-colors">
                  Expiry Timeline
                </Link>
              </li>
              <li>
                <Link href="/warehouse" className="hover:text-grocery-800 transition-colors">
                  Zone Manager
                </Link>
              </li>
            </ul>
          </div>

          {/* Interactive & AI */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
              Experiential
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/simulation" className="text-emerald-700 font-semibold hover:text-emerald-900 flex items-center gap-1">
                  3D Warehouse Game <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </Link>
              </li>
              <li>
                <Link href="/insights" className="hover:text-grocery-800 transition-colors">
                  AI Markdown Engine
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="hover:text-grocery-800 transition-colors">
                  Waste Analytics
                </Link>
              </li>
              <li>
                <Link href="/alerts" className="hover:text-grocery-800 transition-colors">
                  Urgent Alerts Inbox
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
              Company
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <a href="#how-it-works" className="hover:text-grocery-800 transition-colors">
                  About ShelfPulse
                </a>
              </li>
              <li>
                <a href="#roi-calculator" className="hover:text-grocery-800 transition-colors">
                  Waste Prevention ROI
                </a>
              </li>
              <li>
                <Link href="/settings" className="hover:text-grocery-800 transition-colors">
                  Developer API
                </Link>
              </li>
              <li>
                <span className="text-gray-400">Terms of Service</span>
              </li>
              <li>
                <span className="text-gray-400">Privacy Policy</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} ShelfPulse Technologies. Built for grocery heroes.</p>
          <div className="flex items-center gap-1 text-gray-600">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-tomato-500 fill-tomato-500" />
            <span>for sustainable retail operations.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
