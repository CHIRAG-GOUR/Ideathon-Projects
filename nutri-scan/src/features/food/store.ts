'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FoodItem, ScanHistoryEntry, UsageEntry, Unit } from '@/types';
import { addDays, daysUntil } from '@/lib/expiry';
import { newId } from '@/lib/food/meta';

/**
 * Local-first kitchen store. The browser copy is the source of truth for the UI, so the
 * app keeps working offline; Firebase sync (lib/firebase/sync.ts) mirrors it per user.
 * Deleted items are kept as tombstones (deleted: true) so deletions sync correctly.
 */
export type NewFood = Omit<FoodItem, 'id' | 'addedAt' | 'updatedAt' | 'initialQuantity' | 'deleted'> & { initialQuantity?: number };

interface KitchenState {
  hydrated: boolean;
  foods: FoodItem[];
  usage: UsageEntry[];
  scans: ScanHistoryEntry[];
  onboarded: boolean;
  seenBadges: string[];
  kitchenBestStars: number;

  addFood: (food: NewFood) => string;
  updateFood: (id: string, patch: Partial<Omit<FoodItem, 'id' | 'addedAt'>>) => void;
  deleteFood: (id: string) => void;
  consumeFood: (id: string, amount: number, kind?: 'used' | 'wasted') => UsageEntry | null;
  recordScan: (entry: Omit<ScanHistoryEntry, 'id' | 'at'>) => void;
  loadSampleKitchen: () => void;
  clearSamples: () => void;
  mergeRemote: (remote: { foods: FoodItem[]; usage: UsageEntry[]; scans: ScanHistoryEntry[] }) => void;
  setOnboarded: () => void;
  markBadgesSeen: (ids: string[]) => void;
  recordKitchenStars: (stars: number) => void;
}

const now = () => new Date().toISOString();

export const SAMPLE_FOODS: { name: string; category: FoodItem['category']; days: number; quantity: number; unit: Unit; storage: FoodItem['storage']; price: number }[] = [
  { name: 'Milk', category: 'dairy', days: 1, quantity: 1, unit: 'l', storage: 'fridge', price: 64 },
  { name: 'Paneer', category: 'dairy', days: 2, quantity: 200, unit: 'g', storage: 'fridge', price: 90 },
  { name: 'Bread', category: 'bakery', days: 3, quantity: 1, unit: 'pack', storage: 'pantry', price: 45 },
  { name: 'Bananas', category: 'fruit', days: 4, quantity: 6, unit: 'pcs', storage: 'counter', price: 60 },
  { name: 'Yogurt', category: 'dairy', days: 6, quantity: 400, unit: 'g', storage: 'fridge', price: 50 },
  { name: 'Orange Juice', category: 'beverages', days: 12, quantity: 1, unit: 'l', storage: 'fridge', price: 120 },
  { name: 'Rice', category: 'grains', days: 200, quantity: 5, unit: 'kg', storage: 'pantry', price: 420 },
];

export const useKitchen = create<KitchenState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      foods: [],
      usage: [],
      scans: [],
      onboarded: false,
      seenBadges: [],
      kitchenBestStars: 0,

      setOnboarded: () => set({ onboarded: true }),
      markBadgesSeen: (ids) => set({ seenBadges: [...new Set([...get().seenBadges, ...ids])] }),
      recordKitchenStars: (stars) => set({ kitchenBestStars: Math.max(get().kitchenBestStars, stars) }),

      addFood: (food) => {
        const id = newId('food');
        const t = now();
        const item: FoodItem = { ...food, id, initialQuantity: food.initialQuantity ?? food.quantity, addedAt: t, updatedAt: t };
        set({ foods: [item, ...get().foods] });
        return id;
      },

      updateFood: (id, patch) =>
        set({ foods: get().foods.map((f) => (f.id === id ? { ...f, ...patch, updatedAt: now() } : f)) }),

      deleteFood: (id) => set({ foods: get().foods.map((f) => (f.id === id ? { ...f, deleted: true, updatedAt: now() } : f)) }),

      consumeFood: (id, amount, kind = 'used') => {
        const food = get().foods.find((f) => f.id === id && !f.deleted);
        if (!food || !(amount > 0)) return null;
        const used = Math.min(amount, food.quantity);
        const remaining = Math.max(0, +(food.quantity - used).toFixed(3));
        const days = daysUntil(food.expiryDate);
        const entry: UsageEntry = {
          id: newId('use'),
          foodId: id,
          name: food.name,
          at: now(),
          kind,
          amount: used,
          unit: food.unit,
          beforeExpiry: days === null ? null : days >= 0,
          value: food.price !== null && food.initialQuantity > 0 ? Math.round((food.price * used) / food.initialQuantity) : null,
        };
        set({
          usage: [entry, ...get().usage].slice(0, 500),
          foods: get().foods.map((f) => (f.id === id ? { ...f, quantity: remaining, deleted: remaining === 0 ? true : f.deleted, updatedAt: now() } : f)),
        });
        return entry;
      },

      recordScan: (entry) => set({ scans: [{ ...entry, id: newId('scan'), at: now() }, ...get().scans].slice(0, 40) }),

      loadSampleKitchen: () => {
        const t = now();
        const existing = new Set(get().foods.filter((f) => !f.deleted).map((f) => f.name.toLowerCase()));
        const items: FoodItem[] = SAMPLE_FOODS.filter((s) => !existing.has(s.name.toLowerCase())).map((s) => ({
          id: newId('food'),
          name: s.name,
          brand: null,
          category: s.category,
          quantity: s.quantity,
          initialQuantity: s.quantity,
          unit: s.unit,
          storage: s.storage,
          expiryDate: addDays(s.days),
          expirySource: 'user',
          price: s.price,
          photo: null,
          nutrition: null,
          allergens: null,
          addedAt: t,
          updatedAt: t,
          sample: true,
        }));
        set({ foods: [...items, ...get().foods] });
      },

      clearSamples: () => set({ foods: get().foods.map((f) => (f.sample && !f.deleted ? { ...f, deleted: true, updatedAt: now() } : f)) }),

      mergeRemote: (remote) => {
        const byId = new Map(get().foods.map((f) => [f.id, f]));
        for (const r of remote.foods) {
          const local = byId.get(r.id);
          if (!local || r.updatedAt > local.updatedAt) byId.set(r.id, r);
        }
        const mergeList = <T extends { id: string; at: string }>(a: T[], b: T[], max: number) => {
          const m = new Map(a.map((x) => [x.id, x]));
          b.forEach((x) => m.set(x.id, x));
          return [...m.values()].sort((x, y) => (x.at < y.at ? 1 : -1)).slice(0, max);
        };
        set({
          foods: [...byId.values()].sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1)),
          usage: mergeList(get().usage, remote.usage, 500),
          scans: mergeList(get().scans, remote.scans, 40),
        });
      },
    }),
    {
      name: 'nutri-scan-kitchen-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ foods: s.foods, usage: s.usage, scans: s.scans, onboarded: s.onboarded, seenBadges: s.seenBadges, kitchenBestStars: s.kitchenBestStars }),
      onRehydrateStorage: () => () => {
        useKitchen.setState({ hydrated: true });
      },
    }
  )
);

/** Live (non-deleted) foods. */
export function useActiveFoods(): FoodItem[] {
  const foods = useKitchen((s) => s.foods);
  return foods.filter((f) => !f.deleted);
}
