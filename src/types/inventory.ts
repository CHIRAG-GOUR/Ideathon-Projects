export type ProductCategory =
  | 'Dairy'
  | 'Bakery'
  | 'Fruits'
  | 'Vegetables'
  | 'Beverages'
  | 'Snacks'
  | 'Staples'
  | 'Frozen'
  | 'Household';

export type WarehouseZone =
  | 'STORAGE'
  | 'FRESH'
  | 'WATCH'
  | 'SELL_FIRST'
  | 'EXPIRING'
  | 'EXPIRED';

export type RiskLevel = 'FRESH' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPIRED';

export type DemandRate = 'VERY_LOW' | 'LOW' | 'NORMAL' | 'HIGH' | 'SURGING';

export interface Product {
  id: string;
  name: string;
  brand: string;
  sku: string;
  barcode: string;
  category: ProductCategory;
  unit: string;
  quantity: number;
  minThreshold: number;
  batchNumber: string;
  manufacturingDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  shelfLifeDays: number;
  costPrice: number; // in ₹ INR
  sellingPrice: number; // in ₹ INR
  discountPercent: number; // e.g. 0, 15, 30
  demandRate: DemandRate;
  warehouseLocation: WarehouseZone;
  shelfPosition?: string; // e.g. "Rack A-3", "Front Display", "Cooler 2"
  imageUrl: string;
  scanned: boolean;
  priorityScore: number; // 0 to 100
  notes?: string;
  lastUpdated: string;
}

export interface CategorySummary {
  category: ProductCategory;
  totalProducts: number;
  totalUnits: number;
  totalValue: number;
  atRiskUnits: number;
  atRiskValue: number;
  avgDaysRemaining: number;
  healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

export interface AIInsight {
  id: string;
  productId?: string;
  title: string;
  category: 'STOCK_ROTATION' | 'MARKDOWN' | 'DEMAND_ALERT' | 'OVERSTOCK' | 'WASTE_RISK';
  severity: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  dataPoints: { label: string; value: string }[];
  recommendedAction: string;
  actionType: 'MOVE_FRONT' | 'APPLY_DISCOUNT' | 'BUNDLE' | 'PURGE' | 'REORDER';
  targetZone?: WarehouseZone;
  discountPercent?: number;
  potentialRecovery: number; // ₹
  applied: boolean;
  timestamp: string;
}

export interface AlertItem {
  id: string;
  type: 'URGENT' | 'WARNING' | 'INFO' | 'SUCCESS';
  title: string;
  description: string;
  productId?: string;
  category?: ProductCategory;
  actionLabel?: string;
  actionRoute?: string;
  read: boolean;
  timestamp: string;
}

export interface SimulationMission {
  id: number;
  title: string;
  objective: string;
  description: string;
  targetCount: number;
  currentCount: number;
  completed: boolean;
  rewardText: string;
}

export interface SimulationSummary {
  scannedCount: number;
  correctlyPrioritizedCount: number;
  incorrectlyPlacedCount: number;
  wastePreventedValue: number; // ₹
  stockRecoveredValue: number; // ₹
  timeSpentSeconds: number;
  accuracyRate: number;
  timestamp: string;
}
