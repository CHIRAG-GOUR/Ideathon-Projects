'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Boxes,
  ScanLine,
  Clock,
  Warehouse,
  Sparkles,
  BarChart3,
  BellRing,
  Gamepad2,
  Settings,
  Leaf,
  Store,
  ExternalLink,
} from 'lucide-react';
import { useGroceryStore } from '@/lib/store';
import { calculateInventoryMetrics } from '@/lib/calculations';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
  isNew?: boolean;
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { products, alerts, storeInfo } = useGroceryStore();
  const metrics = calculateInventoryMetrics(products);
  const unreadAlertsCount = alerts.filter((a) => !a.read).length;

  const mainNavItems: NavItem[] = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    {
      name: 'Inventory',
      href: '/inventory',
      icon: Boxes,
      badge: products.length,
      badgeColor: 'bg-cardboard-200 text-cardboard-700',
    },
    { name: 'Barcode Scanner', href: '/scanner', icon: ScanLine },
    {
      name: 'Expiry Tracker',
      href: '/expiry',
      icon: Clock,
      badge: metrics.expiringSoonCount > 0 ? metrics.expiringSoonCount : undefined,
      badgeColor: 'bg-tomato-100 text-tomato-600 border border-tomato-200 animate-pulse-subtle',
    },
    { name: 'Warehouse Zones', href: '/warehouse', icon: Warehouse },
    {
      name: 'AI Insights',
      href: '/insights',
      icon: Sparkles,
      badge: 'Smart',
      badgeColor: 'bg-emerald-100 text-emerald-700',
    },
    { name: 'Analytics & Trends', href: '/analytics', icon: BarChart3 },
    {
      name: 'Alerts Inbox',
      href: '/alerts',
      icon: BellRing,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : undefined,
      badgeColor: 'bg-mango-100 text-mango-700',
    },
  ];

  const bottomNavItems: NavItem[] = [
    {
      name: '3D Simulation',
      href: '/simulation',
      icon: Gamepad2,
      isNew: true,
      badge: '3D Play',
      badgeColor: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm font-semibold',
    },
    { name: 'Store Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 flex-shrink-0 flex-col justify-between border-r border-[#EFEAE0] bg-[#FAF8F4] hidden lg:flex h-screen sticky top-0">
      {/* Brand Logo & Store Header */}
      <div className="p-5 pb-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-grocery-600 to-grocery-800 flex items-center justify-center shadow-md shadow-grocery-700/20 group-hover:scale-105 transition-transform">
            <Leaf className="w-5 h-5 text-emerald-300 transform -rotate-12" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-xl tracking-tight text-grocery-900">
                Shelf<span className="text-grocery-500">Pulse</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-grocery-100 text-grocery-700 border border-grocery-200">
                OS
              </span>
            </div>
            <p className="text-[11px] text-cardboard-600 font-medium tracking-tight">
              Smart Grocery Operating System
            </p>
          </div>
        </Link>

        {/* Current Active Store Card */}
        <div className="mt-4 p-2.5 rounded-xl bg-white border border-[#EBE3D3] shadow-warm-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cardboard-100 flex items-center justify-center text-cardboard-600 flex-shrink-0">
            <Store className="w-4 h-4 text-grocery-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-900 truncate">
              {storeInfo.name}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="truncate">{storeInfo.location}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-cardboard-500">
          Store Operations
        </div>

        {mainNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'text-grocery-800 bg-white font-semibold shadow-warm-sm border border-[#E8E0D2]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-cream-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-grocery-100 text-grocery-700'
                      : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span>{item.name}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    item.badgeColor || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {isActive && (
                <motion.div
                  layoutId="activePill"
                  className="absolute left-0 w-1 h-5 bg-grocery-600 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="pt-3 pb-1">
          <div className="h-[1px] bg-[#EFE9DC] mx-2" />
        </div>

        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-cardboard-500 flex items-center justify-between">
          <span>Interactive Experiential</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-semibold">WOW</span>
        </div>

        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                item.isNew && !isActive
                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-200/80 text-emerald-900 hover:border-emerald-300 shadow-sm'
                  : isActive
                  ? 'text-grocery-800 bg-white font-semibold shadow-warm-sm border border-[#E8E0D2]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-cream-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    item.isNew
                      ? 'bg-emerald-600 text-white'
                      : isActive
                      ? 'bg-grocery-100 text-grocery-700'
                      : 'text-gray-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span>{item.name}</span>
              </div>

              {item.badge && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}

              {isActive && (
                <motion.div
                  layoutId="activePill"
                  className="absolute left-0 w-1 h-5 bg-grocery-600 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer Store Status Widget */}
      <div className="p-4 border-t border-[#EFEAE0] bg-[#F7F4EE]">
        <div className="p-3 rounded-xl bg-white border border-[#EAE2D2] shadow-warm-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-800">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Stock Health
            </span>
            <span className="text-grocery-700 font-bold">{metrics.stockHealthIndex}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
              style={{ width: `${metrics.stockHealthIndex}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-500">
            <span>Waste Risk: ₹{metrics.totalWasteRisk.toLocaleString('en-IN')}</span>
            <Link
              href="/"
              className="text-grocery-600 hover:text-grocery-700 flex items-center gap-0.5 font-medium"
            >
              Landing <ExternalLink className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
};
