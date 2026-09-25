'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  ScanLine,
  Bell,
  Check,
  Building2,
  ChevronDown,
  Sparkles,
  Menu,
  X,
  PlusCircle,
} from 'lucide-react';
import { useGroceryStore } from '@/lib/store';
import { calculateInventoryMetrics } from '@/lib/calculations';
import { Product } from '@/types/inventory';

interface TopNavbarProps {
  onOpenMobileMenu?: () => void;
  onOpenAddModal?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onOpenMobileMenu,
  onOpenAddModal,
}) => {
  const router = useRouter();
  const {
    storeInfo,
    setStoreInfo,
    alerts,
    markAlertAsRead,
    products,
    searchQuery,
    setSearchQuery,
    setSelectedProductId,
  } = useGroceryStore();

  const [isStoreMenuOpen, setIsStoreMenuOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const unreadAlerts = alerts.filter((a) => !a.read);
  const metrics = calculateInventoryMetrics(products);

  const STORES = [
    { name: 'Main Grocery Store', location: 'Branch #1', owner: 'Store Manager' },
    { name: 'Secondary Store', location: 'Branch #2', owner: 'Store Manager' },
    { name: 'Warehouse Depot', location: 'Storage Hub', owner: 'Store Manager' },
  ];

  // Quick search results
  const searchResults = searchQuery.trim()
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.barcode.includes(searchQuery) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5)
    : [];

  return (
    <header className="sticky top-0 z-30 bg-[#FAF8F4]/90 backdrop-blur-md border-b border-[#EFEAE0] px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Mobile Menu trigger & Title */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl bg-white border border-[#E8DFD0] text-gray-700 shadow-sm"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/dashboard" className="font-display font-bold text-lg text-grocery-900">
          Shelf<span className="text-grocery-500">Pulse</span>
        </Link>
      </div>

      {/* Search Bar with live autocomplete */}
      <div className="relative flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search milk, bread, barcode (e.g. 8901262...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
            className="w-full pl-10 pr-12 py-2 text-sm bg-white border border-[#E5DEC9] rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-grocery-500/20 focus:border-grocery-600 transition-all shadow-warm-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search Autocomplete Popup */}
        {isSearchFocused && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-[#E8DFC8] rounded-xl shadow-warm-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
            <div className="p-2 border-b border-gray-100 text-[11px] font-semibold text-cardboard-600 bg-cream-50 uppercase tracking-wider">
              Matching Products ({searchResults.length})
            </div>
            <div className="divide-y divide-gray-50">
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => {
                    setSelectedProductId(product.id);
                    router.push('/inventory');
                  }}
                  className="w-full text-left p-3 hover:bg-cream-50 flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{product.imageUrl}</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-800 group-hover:text-grocery-700">
                        {product.name}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {product.category} • Barcode: {product.barcode}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-900">
                      ₹{product.sellingPrice}
                    </span>
                    <p className="text-[10px] text-cardboard-600">
                      {product.quantity} in stock
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Controls & Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Quick Scan Action Button */}
        <Link
          href="/scanner"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-grocery-700 text-white text-xs font-semibold hover:bg-grocery-800 active:scale-95 transition-all shadow-md shadow-grocery-800/15"
        >
          <ScanLine className="w-4 h-4 text-emerald-300" />
          <span className="hidden sm:inline">Scan Stock</span>
        </Link>

        {/* Store Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsStoreMenuOpen(!isStoreMenuOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E5DFC8] text-xs font-medium text-gray-700 hover:border-cardboard-400 shadow-warm-sm transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-grocery-600" />
            <span className="hidden md:inline max-w-[130px] truncate">{storeInfo.name}</span>
            <span className="md:hidden">Store</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {isStoreMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#E8DFD0] rounded-xl shadow-warm-lg p-2 z-50 animate-in fade-in">
              <p className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Select Active Branch
              </p>
              {STORES.map((s) => (
                <button
                  key={s.name}
                  onClick={() => {
                    setStoreInfo(s);
                    setIsStoreMenuOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between text-xs transition-colors ${
                    storeInfo.name === s.name
                      ? 'bg-grocery-50 text-grocery-900 font-semibold'
                      : 'hover:bg-cream-50 text-gray-700'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-gray-800">{s.name}</p>
                    <p className="text-[11px] text-gray-500">{s.location}</p>
                  </div>
                  {storeInfo.name === s.name && (
                    <Check className="w-4 h-4 text-grocery-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Alerts Notification Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            className="relative p-2.5 rounded-xl bg-white border border-[#E5DFC8] text-gray-700 hover:text-gray-900 hover:border-cardboard-400 shadow-warm-sm transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-tomato-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {isAlertsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-[#E8DFD0] rounded-2xl shadow-warm-xl p-3 z-50 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Store Notifications
                  </h4>
                  {unreadAlerts.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-tomato-100 text-tomato-700 font-semibold">
                      {unreadAlerts.length} New
                    </span>
                  )}
                </div>
                <Link
                  href="/alerts"
                  onClick={() => setIsAlertsOpen(false)}
                  className="text-[11px] text-grocery-600 hover:underline font-medium"
                >
                  View All
                </Link>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {alerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => markAlertAsRead(alert.id)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      alert.read
                        ? 'bg-cream-50/50 border-gray-100 opacity-75'
                        : alert.type === 'URGENT'
                        ? 'bg-tomato-50/60 border-tomato-200'
                        : alert.type === 'SUCCESS'
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-white border-cardboard-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900">{alert.title}</p>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {alert.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                      {alert.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Store Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-cardboard-200">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            GS
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-gray-900 leading-tight">
              {storeInfo.owner}
            </p>
            <p className="text-[10px] text-cardboard-600 font-medium">
              {storeInfo.name}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
