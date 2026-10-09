'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Sparkles,
  AlertOctagon,
  Clock,
  Calendar,
  Layers,
  Recycle,
  CheckCircle2,
  Milk,
  Croissant,
  Cookie,
  CupSoda,
  Flame,
  Package,
  Search,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { CroissantArt, PaneerCompostArt, SpotWasteToValue, SpotSafetyShield } from '@/components/art/AfterExpiryArt';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { playSuccessChime } from '@/lib/sound';
import { cn } from '@/lib/utils';

interface ExpiredDemoItem {
  id: string;
  name: string;
  category: string;
  daysPast: number;
  expiryDateStr: string;
  units: number;
  cost: number;
  howToRepurpose: string;
  repurposeType: 'baking' | 'compost';
}

const DEMO_EXPIRED_ITEMS: ExpiredDemoItem[] = [
  {
    id: 'croissant-pack',
    name: 'Butter Croissant Pack',
    category: 'Bakery',
    daysPast: 2,
    expiryDateStr: '07 Oct 2026',
    units: 6,
    cost: 540,
    howToRepurpose:
      'If the butter is not rancid, use it for baking or greasing pans. Discard immediately if it smells bitter or has dark spots.',
    repurposeType: 'baking',
  },
  {
    id: 'fresh-paneer',
    name: 'Fresh Paneer 200g',
    category: 'Dairy',
    daysPast: 1,
    expiryDateStr: '08 Oct 2026',
    units: 9,
    cost: 702,
    howToRepurpose:
      'Do not consume expired paneer. If it is only slightly past date and still smells fresh, it can be crumbled into plant pots as a calcium-rich soil additive after composting.',
    repurposeType: 'compost',
  },
];

interface CheatCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  tone: {
    badgeBg: string;
    badgeText: string;
    border: string;
    headerBg: string;
  };
  tips: string[];
}

const CATEGORY_CHEAT_SHEET: CheatCategory[] = [
  {
    id: 'dairy',
    name: 'Dairy',
    icon: Milk,
    tone: {
      badgeBg: 'bg-sky-100',
      badgeText: 'text-sky-800',
      border: 'border-sky-200',
      headerBg: 'bg-sky-50/70',
    },
    tips: [
      'Slightly sour milk can be used to make paneer or buttermilk for baking and marinades.',
      'Curd and yogurt work as natural hair conditioners or face masks.',
      'Expired butter can flavour baking if it is not rancid.',
    ],
  },
  {
    id: 'bakery',
    name: 'Bakery',
    icon: Croissant,
    tone: {
      badgeBg: 'bg-soil-100',
      badgeText: 'text-soil-800',
      border: 'border-soil-200',
      headerBg: 'bg-soil-50/70',
    },
    tips: [
      'Stale bread becomes breadcrumbs, croutons or bread pudding.',
      'Dry bread crusts can be ground into coating for cutlets.',
      'Croissants and buns can be baked into a sweet or savoury pudding.',
    ],
  },
  {
    id: 'snacks',
    name: 'Snacks',
    icon: Cookie,
    tone: {
      badgeBg: 'bg-mango-100',
      badgeText: 'text-mango-800',
      border: 'border-mango-200',
      headerBg: 'bg-mango-50/70',
    },
    tips: [
      'Crushed chips and namkeen make a crunchy topping for chaat and salads.',
      'Stale biscuits can be crushed for pie crusts or cheesecake bases.',
      'Salty snacks can be mixed into batter for savoury fritters.',
    ],
  },
  {
    id: 'beverages',
    name: 'Beverages',
    icon: CupSoda,
    tone: {
      badgeBg: 'bg-leaf-100',
      badgeText: 'text-leaf-800',
      border: 'border-leaf-200',
      headerBg: 'bg-leaf-50/70',
    },
    tips: [
      'Fruit juice past its date can be used in marinades or salad dressings.',
      'Flat or expired soft drinks can clean metal taps or dissolve limescale.',
      'Cold coffee can be frozen into ice cubes for iced drinks or desserts.',
    ],
  },
  {
    id: 'cooking',
    name: 'Cooking Essentials',
    icon: Flame,
    tone: {
      badgeBg: 'bg-tomato-100',
      badgeText: 'text-tomato-800',
      border: 'border-tomato-200',
      headerBg: 'bg-tomato-50/70',
    },
    tips: [
      'Expired oil can be used for oil lamps or diyas if it is not heavily rancid.',
      'Salt can be used as a natural abrasive cleaner or weed suppressant.',
      'Old flour can be made into homemade paper-mache or craft glue paste.',
    ],
  },
  {
    id: 'packaged',
    name: 'Packaged Food',
    icon: Package,
    tone: {
      badgeBg: 'bg-cream-200',
      badgeText: 'text-ink',
      border: 'border-cream-400',
      headerBg: 'bg-cream-100/70',
    },
    tips: [
      'Check for visible spoilage first. Unopened dry mixes can often still be cooked.',
      'Expired cereals can be crushed into a crispy coating for fried snacks.',
      'Old sauce bottles can be rinsed and used as planters after cleaning.',
    ],
  },
];

export function AfterExpiry() {
  const [repurposedIds, setRepurposedIds] = useState<string[]>([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const totalExpiredItems = DEMO_EXPIRED_ITEMS.length;
  const totalPotentialRecovery = 1242; // ₹540 + ₹702
  const totalSafeReuseIdeas = DEMO_EXPIRED_ITEMS.length;

  const currentRecoveredValue = DEMO_EXPIRED_ITEMS
    .filter((item) => repurposedIds.includes(item.id))
    .reduce((sum, item) => sum + item.cost, 0);

  const handleToggleRepurpose = (id: string, e: React.MouseEvent) => {
    const isNowRepurposed = !repurposedIds.includes(id);
    if (isNowRepurposed) {
      setRepurposedIds((prev) => [...prev, id]);
      playSuccessChime();
      const rect = e.currentTarget.getBoundingClientRect();
      confetti({
        particleCount: 45,
        spread: 60,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
        colors: ['#2F8F55', '#F2A516', '#E4572E', '#F5B633', '#3F8FC7'],
      });
    } else {
      setRepurposedIds((prev) => prev.filter((itemId) => itemId !== id));
    }
  };

  const filteredCategories = CATEGORY_CHEAT_SHEET.filter((cat) => {
    if (activeCategoryFilter !== 'all' && cat.id !== activeCategoryFilter) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      cat.name.toLowerCase().includes(q) ||
      cat.tips.some((tip) => tip.toLowerCase().includes(q))
    );
  });

  return (
    <div className="container-page py-8 sm:py-12">
      {/* Top Breadcrumb / Back Link */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3 text-sm"
      >
        <Link
          href="/stock"
          className="group inline-flex items-center gap-2 font-bold text-leaf-700 transition hover:text-leaf-800"
          title="Back to Expiry Tracker / Stock"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-leaf-100 transition group-hover:-translate-x-0.5 group-hover:bg-leaf-200">
            <ArrowLeft className="h-4 w-4" />
          </span>
          Back to Expiry Tracker
        </Link>

        <a
          href="https://visionary-x-stock-wise.lovable.app/expiry"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink hover:underline"
        >
          External Lovable App View <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </motion.div>

      {/* Main Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow bg-leaf-100 px-3 py-1 rounded-full text-leaf-700">
              <Sparkles className="h-3.5 w-3.5 text-leaf-600" />
              Waste into value
            </span>
            <span className="chip bg-mango-100 text-mango-800 font-medium">
              Demo mode · sample data
            </span>
          </div>

          <h1 className="display-xl mt-3 text-3xl sm:text-5xl font-bold leading-tight text-ink">
            After-Expiry Reuse Guide
          </h1>
          <p className="mt-3 text-base sm:text-lg leading-relaxed text-ink-soft">
            Expired products do not always have to go in the bin. This guide shows safe, practical ways to repurpose common grocery items, starting with the stock that is already past its date in the demo inventory.
          </p>
        </div>

        <div className="flex-none hidden lg:block" aria-hidden>
          <SpotWasteToValue className="h-32 w-32 drop-shadow-sm transition-transform hover:scale-105 duration-300" />
        </div>
      </motion.div>

      {/* 3 Top KPI Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {/* KPI 1 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card relative overflow-hidden p-6 transition-all hover:shadow-lift"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink-muted">Expired items</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-tomato-100 text-tomato-600">
              <AlertOctagon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 font-display text-4xl sm:text-5xl font-bold text-tomato-600">
            <AnimatedNumber value={totalExpiredItems} />
          </p>
          <p className="mt-1 text-sm font-medium text-ink-soft">Currently past their date</p>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-tomato-500" />
        </motion.div>

        {/* KPI 2 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="card relative overflow-hidden p-6 transition-all hover:shadow-lift"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink-muted">Potential recovery</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mango-100 text-mango-600">
              <Sparkles className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 font-display text-4xl sm:text-5xl font-bold text-ink">
            ₹<AnimatedNumber value={totalPotentialRecovery} />
          </p>
          <p className="mt-1 text-sm font-medium text-ink-soft">
            Estimated value if repurposed
            {currentRecoveredValue > 0 && (
              <span className="ml-1 text-xs font-bold text-leaf-700">
                (₹{currentRecoveredValue} recovered!)
              </span>
            )}
          </p>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-mango-400" />
        </motion.div>

        {/* KPI 3 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="card relative overflow-hidden p-6 transition-all hover:shadow-lift"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink-muted">Safe reuse ideas</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-leaf-100 text-leaf-600">
              <Recycle className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 font-display text-4xl sm:text-5xl font-bold text-leaf-700">
            <AnimatedNumber value={totalSafeReuseIdeas} />
          </p>
          <p className="mt-1 text-sm font-medium text-ink-soft">Matched to demo products</p>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-leaf-600" />
        </motion.div>
      </div>

      {/* Section 1: Expired Products in Demo Inventory */}
      <section className="mt-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
                Expired products in demo inventory
              </h2>
              <span className="chip bg-tomato-100 text-tomato-700 font-bold px-2.5 py-0.5">
                {DEMO_EXPIRED_ITEMS.length}
              </span>
            </div>
            <p className="mt-1 text-sm sm:text-base text-ink-muted">
              Each card shows the product, how many days it is past its date, and a practical reuse suggestion.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {DEMO_EXPIRED_ITEMS.map((item, index) => {
            const isRepurposed = repurposedIds.includes(item.id);
            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.1 }}
                className={cn(
                  'card group relative overflow-hidden transition-all duration-300',
                  isRepurposed
                    ? 'ring-2 ring-leaf-500 bg-leaf-50/30 shadow-md'
                    : 'hover:shadow-lift'
                )}
              >
                {/* Visual Header Banner */}
                <div
                  className="relative flex h-44 items-center justify-center p-4"
                  style={{
                    background:
                      item.repurposeType === 'baking'
                        ? 'linear-gradient(180deg, #FDE6DF 0%, #FFF8EC 100%)'
                        : 'linear-gradient(180deg, #FDE6DF 0%, #E1F2E4 100%)',
                  }}
                >
                  {/* Subtle Shelf Plinth */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-3"
                    style={{ background: 'linear-gradient(180deg, #E6C697, #C4985F)' }}
                  />

                  {/* Artwork */}
                  <div className="relative z-10 transition-transform duration-300 group-hover:scale-105">
                    {item.id === 'croissant-pack' ? (
                      <CroissantArt className="h-32 w-32 drop-shadow-sm" />
                    ) : (
                      <PaneerCompostArt className="h-32 w-32 drop-shadow-sm" />
                    )}
                  </div>

                  {/* Top Badges */}
                  <div className="absolute left-4 top-4 flex flex-wrap items-center gap-1.5">
                    <span className="chip bg-tomato-500 text-white font-bold shadow-sm">
                      Expired
                    </span>
                    <span className="chip bg-white/90 text-tomato-700 ring-1 ring-tomato-200">
                      <Clock className="h-3 w-3" />
                      {item.daysPast} {item.daysPast === 1 ? 'day' : 'days'} past
                    </span>
                  </div>

                  <span className="chip absolute right-4 top-4 bg-white/90 text-ink-muted">
                    <Calendar className="h-3 w-3" />
                    {item.expiryDateStr}
                  </span>
                </div>

                {/* Card Content Body */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                        {item.category}
                      </span>
                      <h3 className="font-display text-2xl font-bold text-ink">{item.name}</h3>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-ink">{item.units} units</p>
                      <p className="text-xs font-bold text-tomato-600">est. ₹{item.cost} at cost</p>
                    </div>
                  </div>

                  {/* How to Repurpose Box */}
                  <div className="mt-4 rounded-3xl bg-cream-100 p-4 ring-1 ring-inset ring-cream-300/80">
                    <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-leaf-800">
                      <Sparkles className="h-3.5 w-3.5 text-mango-500" />
                      How to repurpose
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                      {item.howToRepurpose}
                    </p>
                  </div>

                  {/* Action Button */}
                  <div className="mt-5 flex items-center justify-between border-t border-cream-300 pt-4">
                    <button
                      onClick={(e) => handleToggleRepurpose(item.id, e)}
                      className={cn(
                        'btn btn-sm w-full gap-2 transition-all',
                        isRepurposed
                          ? 'bg-leaf-600 text-white hover:bg-leaf-700'
                          : 'btn-secondary text-ink hover:bg-cream-200'
                      )}
                    >
                      {isRepurposed ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> Repurposed (₹{item.cost} Value Saved)
                        </>
                      ) : (
                        <>
                          <Recycle className="h-4 w-4 text-leaf-600" /> Mark as Repurposed (+₹{item.cost})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* Section 2: Category Reuse Cheat Sheet */}
      <section className="mt-16">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
              Category reuse cheat sheet
            </h2>
            <p className="mt-1 text-sm sm:text-base text-ink-muted">
              General rules for common grocery categories. Always inspect the item first and follow local food-safety regulations.
            </p>
          </div>
        </div>

        {/* Category Filter & Search */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist">
            <button
              onClick={() => setActiveCategoryFilter('all')}
              className={cn(
                'chip py-2 px-3 text-xs font-bold transition',
                activeCategoryFilter === 'all'
                  ? 'bg-ink text-white ring-1 ring-ink'
                  : 'bg-white text-ink-soft ring-1 ring-cream-300 hover:bg-cream-100'
              )}
            >
              All Categories ({CATEGORY_CHEAT_SHEET.length})
            </button>
            {CATEGORY_CHEAT_SHEET.map((cat) => {
              const active = activeCategoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryFilter(cat.id)}
                  className={cn(
                    'chip py-2 px-3 text-xs font-bold transition',
                    active
                      ? 'bg-leaf-700 text-white ring-1 ring-leaf-700'
                      : 'bg-white text-ink-soft ring-1 ring-cream-300 hover:bg-cream-100'
                  )}
                >
                  <cat.icon className="h-3.5 w-3.5" />
                  {cat.name}
                </button>
              );
            })}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder="Search reuse tips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full bg-white py-2 pl-9 pr-4 text-xs font-medium text-ink ring-1 ring-inset ring-cream-300 placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-leaf-500"
            />
          </div>
        </div>

        {/* Categories Grid */}
        <motion.div layout className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <motion.div
                  layout
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'card flex flex-col justify-between overflow-hidden border transition-all hover:shadow-lift',
                    cat.tone.border
                  )}
                >
                  <div>
                    {/* Header */}
                    <div className={cn('flex items-center gap-3 p-5 border-b border-cream-200', cat.tone.headerBg)}>
                      <span className={cn('flex h-11 w-11 flex-none items-center justify-center rounded-2xl shadow-sm', cat.tone.badgeBg, cat.tone.badgeText)}>
                        <Icon className="h-6 w-6" />
                      </span>
                      <div>
                        <h3 className="font-display text-xl font-bold text-ink">{cat.name}</h3>
                        <p className="text-xs font-semibold text-ink-muted">{cat.tips.length} verified safe practices</p>
                      </div>
                    </div>

                    {/* Tips List */}
                    <div className="p-5">
                      <ul className="space-y-3">
                        {cat.tips.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-ink-soft">
                            <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-leaf-100 text-leaf-700 text-[10px] font-extrabold mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-cream-50/70 p-3.5 border-t border-cream-200/80 text-center">
                    <span className="text-[11px] font-bold text-ink-muted">
                      Inspect package seal & smell before repurposing
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Safety Notice & Bottom Callout */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-14 rounded-4xl bg-tomato-50 p-6 ring-1 ring-tomato-200 sm:p-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-tomato-500 text-white shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-display text-xl font-bold text-tomato-900">
              Safety First · Food Hygiene Standard
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-tomato-800">
              Safety first. These suggestions are for demo and educational purposes only. Never consume food that is spoiled, mouldy, foul-smelling or prohibited by local law. Always follow manufacturer guidance.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Bottom Navigation Prompt */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-4xl bg-cream-200/60 p-6 ring-1 ring-cream-300">
        <div>
          <p className="font-display text-lg font-bold text-ink">Ready to organize more inventory?</p>
          <p className="text-xs sm:text-sm text-ink-muted">Scan upcoming stock and allocate it to the right shelf before it expires.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/scanner" className="btn btn-primary btn-md">
            Open Barcode Scanner <ChevronRight className="h-4 w-4" />
          </Link>
          <Link href="/stock" className="btn btn-secondary btn-md">
            View My Stock
          </Link>
        </div>
      </div>
    </div>
  );
}
