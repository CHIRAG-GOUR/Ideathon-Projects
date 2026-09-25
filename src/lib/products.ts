export type ShelfZone = 'SELL_FIRST' | 'SELL_SOON' | 'FRESH';

export interface DemoProduct {
  id: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  daysUntilExpiry: number;
  shelfLifeText: string;
  idealZone: ShelfZone;
  currentZone: ShelfZone | 'UNASSIGNED';
  scanned: boolean;
  placedCorrectly: boolean;
  cost: number;
  sellingPrice: number;
  emoji: string;
  tip: string;
}

export const INITIAL_DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: 'prod-1',
    barcode: '890000000001',
    name: 'Milk',
    category: 'Dairy',
    unit: '1 Litre Pouch',
    quantity: 42,
    daysUntilExpiry: 2,
    shelfLifeText: 'Expires in 2 days',
    idealZone: 'SELL_FIRST',
    currentZone: 'UNASSIGNED',
    scanned: false,
    placedCorrectly: false,
    cost: 48,
    sellingPrice: 56,
    emoji: '🥛',
    tip: 'Short shelf life! Place on the front shelf so customers buy it first.',
  },
  {
    id: 'prod-2',
    barcode: '890000000002',
    name: 'Bread',
    category: 'Bakery',
    unit: '400g Loaf',
    quantity: 18,
    daysUntilExpiry: 4,
    shelfLifeText: 'Expires in 4 days',
    idealZone: 'SELL_SOON',
    currentZone: 'UNASSIGNED',
    scanned: false,
    placedCorrectly: false,
    cost: 38,
    sellingPrice: 50,
    emoji: '🍞',
    tip: 'Keep in the middle watch zone and sell within 4 days.',
  },
  {
    id: 'prod-3',
    barcode: '890000000003',
    name: 'Biscuits',
    category: 'Snacks',
    unit: 'Family Pack',
    quantity: 35,
    daysUntilExpiry: 30,
    shelfLifeText: 'Expires in 30 days',
    idealZone: 'FRESH',
    currentZone: 'UNASSIGNED',
    scanned: false,
    placedCorrectly: false,
    cost: 25,
    sellingPrice: 35,
    emoji: '🍪',
    tip: 'Long shelf life. Safe in standard fresh storage shelves.',
  },
  {
    id: 'prod-4',
    barcode: '890000000004',
    name: 'Juice',
    category: 'Beverages',
    unit: '1 Litre Tetra Pak',
    quantity: 22,
    daysUntilExpiry: 12,
    shelfLifeText: 'Expires in 12 days',
    idealZone: 'FRESH',
    currentZone: 'UNASSIGNED',
    scanned: false,
    placedCorrectly: false,
    cost: 75,
    sellingPrice: 110,
    emoji: '🧃',
    tip: 'Tetra pak keeps it fresh for almost 2 weeks.',
  },
  {
    id: 'prod-5',
    barcode: '890000000005',
    name: 'Paneer',
    category: 'Dairy',
    unit: '200g Pack',
    quantity: 16,
    daysUntilExpiry: 1,
    shelfLifeText: 'Expires in 1 day',
    idealZone: 'SELL_FIRST',
    currentZone: 'UNASSIGNED',
    scanned: false,
    placedCorrectly: false,
    cost: 72,
    sellingPrice: 90,
    emoji: '🧀',
    tip: 'Critical expiry tomorrow! Must be in SELL FIRST immediately.',
  },
  {
    id: 'prod-6',
    barcode: '890000000006',
    name: 'Rice',
    category: 'Staples',
    unit: '5 Kg Bag',
    quantity: 50,
    daysUntilExpiry: 180,
    shelfLifeText: 'Expires in 180 days',
    idealZone: 'FRESH',
    currentZone: 'UNASSIGNED',
    scanned: false,
    placedCorrectly: false,
    cost: 320,
    sellingPrice: 420,
    emoji: '🍚',
    tip: 'Pantry staple with 6 months shelf life.',
  },
];
