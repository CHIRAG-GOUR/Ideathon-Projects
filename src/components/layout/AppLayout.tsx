'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import {
  LayoutDashboard,
  Boxes,
  ScanLine,
  Clock,
  Sparkles,
  Gamepad2,
  X,
  Store,
  Warehouse,
  BarChart3,
  BellRing,
  Settings,
  Leaf,
} from 'lucide-react';
import { useGroceryStore } from '@/lib/store';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { alerts, products } = useGroceryStore();
  const unreadAlertsCount = alerts.filter((a) => !a.read).length;

  const mobileNavItems = [
    { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Stock', href: '/inventory', icon: Boxes },
    { name: 'Scan', href: '/scanner', icon: ScanLine, highlight: true },
    { name: 'Expiry', href: '/expiry', icon: Clock },
    { name: '3D Play', href: '/simulation', icon: Gamepad2 },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row text-foreground">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-full bg-[#FAF8F4] h-full shadow-2xl z-10 p-5 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#EBE3D3]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-grocery-700 flex items-center justify-center">
                    <Leaf className="w-4 h-4 text-emerald-300" />
                  </div>
                  <span className="font-display font-bold text-lg text-grocery-900">
                    ShelfPulse OS
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-1">
                {[
                  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
                  { name: 'Inventory', href: '/inventory', icon: Boxes },
                  { name: 'Barcode Scanner', href: '/scanner', icon: ScanLine },
                  { name: 'Expiry Tracker', href: '/expiry', icon: Clock },
                  { name: 'Warehouse Zones', href: '/warehouse', icon: Warehouse },
                  { name: 'AI Insights', href: '/insights', icon: Sparkles },
                  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
                  { name: 'Alerts', href: '/alerts', icon: BellRing },
                  { name: '3D Simulation', href: '/simulation', icon: Gamepad2, isNew: true },
                  { name: 'Settings', href: '/settings', icon: Settings },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                      pathname === item.href
                        ? 'bg-grocery-700 text-white font-semibold shadow-sm'
                        : 'text-gray-700 hover:bg-cream-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                    {item.isNew && (
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-500 text-white font-bold">
                        3D
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-cardboard-200 text-xs text-cardboard-600 text-center">
              ShelfPulse Retail OS v1.0
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <TopNavbar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#FAF8F4]/95 backdrop-blur-md border-t border-[#EAE2D2] px-2 py-1.5 flex items-center justify-around lg:hidden z-40 shadow-lg">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center -mt-5"
              >
                <div className="w-12 h-12 rounded-full bg-grocery-700 text-white shadow-lg flex items-center justify-center border-2 border-white active:scale-95 transition-transform">
                  <Icon className="w-5 h-5 text-emerald-300" />
                </div>
                <span className="text-[10px] font-bold text-grocery-800 mt-0.5">
                  {item.name}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
                isActive
                  ? 'text-grocery-700 font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-grocery-700' : 'text-gray-400'}`} />
              <span className="mt-0.5">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
