'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  PRODUCTS,
  Product,
  ZoneId,
  ZONES,
  findProductByBarcode,
  getRecommendedZone,
  formatExpiry,
} from './products';

/**
 * Shared shop state. The scanner, My Stock, the dashboard and the 3D warehouse all
 * read and write this one store, so scanning Milk on the real camera marks it as
 * scanned inside the 3D game too. Product definitions stay in `products.ts`;
 * only progress lives here.
 */

export const POINTS_PER_PLACEMENT = 100;

export interface ProductProgress {
  scanned: boolean;
  /** Where the product currently sits. null = still in the delivery area. */
  zone: ZoneId | null;
  placedCorrectly: boolean;
  wrongAttempts: number;
}

export type DemoStep = 1 | 2 | 3 | 4 | 5;

export interface DemoState {
  active: boolean;
  step: DemoStep;
  /** True once one full scan → arrange → points loop is done. */
  roundComplete: boolean;
}

export interface PlaceResult {
  correct: boolean;
  title: string;
  message: string;
  pointsEarned: number;
  allOrganized: boolean;
}

interface ShopState {
  progress: Record<string, ProductProgress>;
  points: number;
  lastScannedId: string | null;
  /** Product handed from the scanner to the warehouse ("Arrange Product"). */
  handoffId: string | null;
  demo: DemoState;

  scanBarcode: (raw: string) => Product | null;
  markScanned: (productId: string) => void;
  placeProduct: (productId: string, zone: ZoneId) => PlaceResult;
  setHandoff: (productId: string | null) => void;
  startDemo: () => void;
  exitDemo: () => void;
  advanceDemo: (step: DemoStep) => void;
  resetShop: () => void;
}

function initialProgress(): Record<string, ProductProgress> {
  return Object.fromEntries(
    PRODUCTS.map((p) => [p.id, { scanned: false, zone: null, placedCorrectly: false, wrongAttempts: 0 }])
  );
}

const initialDemo: DemoState = { active: false, step: 1, roundComplete: false };

export const useShop = create<ShopState>()(
  persist(
    (set, get) => ({
      progress: initialProgress(),
      points: 0,
      lastScannedId: null,
      handoffId: null,
      demo: initialDemo,

      scanBarcode: (raw) => {
        const product = findProductByBarcode(raw);
        if (!product) return null;
        get().markScanned(product.id);
        return product;
      },

      markScanned: (productId) => {
        const { progress, demo } = get();
        const current = progress[productId];
        if (!current) return;
        set({
          progress: { ...progress, [productId]: { ...current, scanned: true } },
          lastScannedId: productId,
          // Scanning shows the product straight away, so steps 1 & 2 are done together.
          demo: demo.active ? { ...demo, step: 3, roundComplete: false } : demo,
        });
      },

      placeProduct: (productId, zone) => {
        const { progress, points, demo } = get();
        const product = PRODUCTS.find((p) => p.id === productId);
        const current = progress[productId];
        if (!product || !current) {
          return { correct: false, title: 'Not found', message: 'That product is not in your stock.', pointsEarned: 0, allOrganized: false };
        }

        const recommended = getRecommendedZone(product);
        const correct = zone === recommended;

        if (!correct) {
          set({ progress: { ...progress, [productId]: { ...current, scanned: true, wrongAttempts: current.wrongAttempts + 1 } } });
          return {
            correct: false,
            title: 'Check the expiry date.',
            message: `${product.name}: ${formatExpiry(product.daysUntilExpiry).toLowerCase()}. Try another shelf.`,
            pointsEarned: 0,
            allOrganized: false,
          };
        }

        const pointsEarned = current.placedCorrectly ? 0 : POINTS_PER_PLACEMENT;
        const nextProgress = {
          ...progress,
          [productId]: { ...current, scanned: true, zone, placedCorrectly: true },
        };
        const allOrganized = PRODUCTS.every((p) => nextProgress[p.id]?.placedCorrectly);

        set({
          progress: nextProgress,
          points: points + pointsEarned,
          handoffId: get().handoffId === productId ? null : get().handoffId,
          demo: demo.active ? { ...demo, step: 5, roundComplete: true } : demo,
        });

        return {
          correct: true,
          title: 'Great job!',
          message: `${product.name} belongs in ${ZONES[zone].label.toUpperCase()}.`,
          pointsEarned,
          allOrganized,
        };
      },

      setHandoff: (productId) => {
        const { demo } = get();
        set({
          handoffId: productId,
          demo: demo.active && productId && demo.step < 4 ? { ...demo, step: 4 } : demo,
        });
      },

      startDemo: () =>
        set({
          progress: initialProgress(),
          points: 0,
          lastScannedId: null,
          handoffId: null,
          demo: { active: true, step: 1, roundComplete: false },
        }),

      exitDemo: () => set({ demo: initialDemo }),

      advanceDemo: (step) => {
        const { demo } = get();
        if (!demo.active || step <= demo.step) return;
        set({ demo: { ...demo, step } });
      },

      resetShop: () =>
        set({
          progress: initialProgress(),
          points: 0,
          lastScannedId: null,
          handoffId: null,
          demo: get().demo.active ? { active: true, step: 1, roundComplete: false } : initialDemo,
        }),
    }),
    {
      name: 'visionary-x-v1',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        progress: s.progress,
        points: s.points,
        lastScannedId: s.lastScannedId,
        handoffId: s.handoffId,
        demo: s.demo,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<ShopState>;
        // Always keep one entry per catalogue product, even if the catalogue changed.
        const progress = initialProgress();
        for (const id of Object.keys(progress)) {
          if (saved.progress?.[id]) progress[id] = { ...progress[id], ...saved.progress[id] };
        }
        return { ...current, ...saved, progress };
      },
    }
  )
);

/* ---------- Derived selectors ---------- */

export interface StockItem extends Product {
  recommendedZone: ZoneId;
  progress: ProductProgress;
}

export function buildStockItems(progress: Record<string, ProductProgress>): StockItem[] {
  return PRODUCTS.map((p) => ({
    ...p,
    recommendedZone: getRecommendedZone(p),
    progress: progress[p.id] ?? { scanned: false, zone: null, placedCorrectly: false, wrongAttempts: 0 },
  }));
}

export function useStockItems(): StockItem[] {
  const progress = useShop((s) => s.progress);
  return buildStockItems(progress);
}

export interface ShopSummary {
  total: number;
  scanned: number;
  organized: number;
  needsAttention: number;
  wastePrevented: number;
  allOrganized: boolean;
}

export function summarize(items: StockItem[]): ShopSummary {
  const scanned = items.filter((i) => i.progress.scanned).length;
  const organized = items.filter((i) => i.progress.placedCorrectly).length;
  const needsAttention = items.filter((i) => i.recommendedZone !== 'FRESH' && !i.progress.placedCorrectly).length;
  const wastePrevented = items.filter((i) => i.progress.placedCorrectly).reduce((s, i) => s + i.atRiskValue, 0);
  return { total: items.length, scanned, organized, needsAttention, wastePrevented, allOrganized: organized === items.length };
}

export function useShopSummary(): ShopSummary {
  return summarize(useStockItems());
}
