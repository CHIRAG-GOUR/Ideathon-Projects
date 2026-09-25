import { Product, RiskLevel, ProductCategory, CategorySummary } from '@/types/inventory';
import { getDaysRemaining } from './utils';

/**
 * Categorize risk level based on days remaining and category perishability
 */
export function calculateRiskLevel(daysRemaining: number, category: ProductCategory): RiskLevel {
  if (daysRemaining < 0) return 'EXPIRED';

  // Perishable items (Dairy, Bakery, Fruits, Vegetables) have tighter windows
  const isPerishable = ['Dairy', 'Bakery', 'Fruits', 'Vegetables'].includes(category);

  if (isPerishable) {
    if (daysRemaining <= 1) return 'HIGH';
    if (daysRemaining <= 3) return 'MEDIUM';
    if (daysRemaining <= 7) return 'LOW';
    return 'FRESH';
  } else {
    // Non-perishables (Staples, Beverages, Snacks, Frozen, Household)
    if (daysRemaining <= 3) return 'HIGH';
    if (daysRemaining <= 10) return 'MEDIUM';
    if (daysRemaining <= 30) return 'LOW';
    return 'FRESH';
  }
}

/**
 * Priority Score (0-100): Higher score means more urgent to sell/move forward.
 * Factors:
 * 1. Days until expiry (45% weight)
 * 2. Total tied-up value = quantity * costPrice (30% weight)
 * 3. Demand rate velocity (15% weight)
 * 4. Current warehouse location (10% weight)
 */
export function calculatePriorityScore(product: Product): number {
  const days = getDaysRemaining(product.expiryDate);
  if (days < 0) return 100; // Expired

  let expiryWeight = 0;
  if (days === 0) expiryWeight = 100;
  else if (days === 1) expiryWeight = 95;
  else if (days <= 3) expiryWeight = 85;
  else if (days <= 7) expiryWeight = 65;
  else if (days <= 14) expiryWeight = 40;
  else if (days <= 30) expiryWeight = 20;
  else expiryWeight = 5;

  const totalValue = product.quantity * product.costPrice;
  const valueWeight = Math.min(100, (totalValue / 5000) * 100);

  const demandMultiplier: Record<string, number> = {
    VERY_LOW: 90, // Low demand means it won't sell without intervention
    LOW: 70,
    NORMAL: 50,
    HIGH: 30,
    SURGING: 15,
  };
  const demandWeight = demandMultiplier[product.demandRate] || 50;

  const score = (expiryWeight * 0.5) + (valueWeight * 0.3) + (demandWeight * 0.2);
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Calculate financial value at immediate risk of waste
 */
export function calculateProductWasteRisk(product: Product): number {
  const days = getDaysRemaining(product.expiryDate);
  if (days < 0) {
    // Already waste
    return product.quantity * product.costPrice;
  }
  if (days <= 3) {
    // High risk: full cost of remaining inventory
    return product.quantity * product.costPrice;
  }
  if (days <= 7) {
    // Medium risk: 40% probability of waste without rotation
    return Math.round(product.quantity * product.costPrice * 0.4);
  }
  return 0;
}

/**
 * Calculate potential recoverable value through timely discounts, priority placement, or bundle deals
 */
export function calculateProductRecoverableValue(product: Product): number {
  const days = getDaysRemaining(product.expiryDate);
  if (days < 0) return 0; // cannot recover expired food

  const wasteRisk = calculateProductWasteRisk(product);
  if (wasteRisk === 0) return 0;

  // With 15-30% discount & front-shelf placement, we recover 70-85% of retail revenue
  const expectedSellPrice = product.sellingPrice * (1 - (product.discountPercent || 15) / 100);
  const recoverablePerUnit = expectedSellPrice;
  return Math.round(recoverablePerUnit * product.quantity * 0.75);
}

export interface InventoryMetrics {
  totalProducts: number;
  totalUnits: number;
  totalInventoryValue: number;
  expiringSoonCount: number; // <= 3 days
  expiredCount: number;
  lowStockCount: number;
  totalWasteRisk: number; // ₹
  totalRecoverableValue: number; // ₹
  stockHealthIndex: number; // 0 - 100%
  priorityItemsCount: number;
}

export function calculateInventoryMetrics(products: Product[]): InventoryMetrics {
  let totalUnits = 0;
  let totalInventoryValue = 0;
  let expiringSoonCount = 0;
  let expiredCount = 0;
  let lowStockCount = 0;
  let totalWasteRisk = 0;
  let totalRecoverableValue = 0;
  let priorityItemsCount = 0;

  products.forEach((p) => {
    totalUnits += p.quantity;
    totalInventoryValue += p.quantity * p.sellingPrice;

    const days = getDaysRemaining(p.expiryDate);
    if (days < 0) {
      expiredCount++;
    } else if (days <= 3) {
      expiringSoonCount++;
    }

    if (p.quantity <= p.minThreshold) {
      lowStockCount++;
    }

    if (p.warehouseLocation === 'SELL_FIRST' || p.priorityScore >= 70) {
      priorityItemsCount++;
    }

    totalWasteRisk += calculateProductWasteRisk(p);
    totalRecoverableValue += calculateProductRecoverableValue(p);
  });

  // Health index: 100 minus penalties for waste risk, expiring items and stockouts
  const riskRatio = totalInventoryValue > 0 ? (totalWasteRisk / totalInventoryValue) : 0;
  const healthPenalty = (riskRatio * 50) + (expiredCount * 3) + (expiringSoonCount * 1.5);
  const stockHealthIndex = Math.min(100, Math.max(15, Math.round(100 - healthPenalty)));

  return {
    totalProducts: products.length,
    totalUnits,
    totalInventoryValue,
    expiringSoonCount,
    expiredCount,
    lowStockCount,
    totalWasteRisk,
    totalRecoverableValue,
    stockHealthIndex,
    priorityItemsCount,
  };
}

export function calculateCategorySummaries(products: Product[]): CategorySummary[] {
  const categories: ProductCategory[] = [
    'Dairy',
    'Bakery',
    'Fruits',
    'Vegetables',
    'Beverages',
    'Snacks',
    'Staples',
    'Frozen',
    'Household',
  ];

  return categories.map((cat) => {
    const items = products.filter((p) => p.category === cat);
    if (items.length === 0) {
      return {
        category: cat,
        totalProducts: 0,
        totalUnits: 0,
        totalValue: 0,
        atRiskUnits: 0,
        atRiskValue: 0,
        avgDaysRemaining: 0,
        healthStatus: 'HEALTHY',
      };
    }

    let totalUnits = 0;
    let totalValue = 0;
    let atRiskUnits = 0;
    let atRiskValue = 0;
    let daysSum = 0;

    items.forEach((p) => {
      totalUnits += p.quantity;
      totalValue += p.quantity * p.sellingPrice;
      const days = getDaysRemaining(p.expiryDate);
      daysSum += Math.max(0, days);

      if (days <= 3) {
        atRiskUnits += p.quantity;
        atRiskValue += calculateProductWasteRisk(p);
      }
    });

    const avgDays = Math.round(daysSum / items.length);
    let healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    if (atRiskUnits > 0 && atRiskValue > 2000) {
      healthStatus = 'CRITICAL';
    } else if (atRiskUnits > 0 || avgDays <= 5) {
      healthStatus = 'WARNING';
    }

    return {
      category: cat,
      totalProducts: items.length,
      totalUnits,
      totalValue,
      atRiskUnits,
      atRiskValue,
      avgDaysRemaining: avgDays,
      healthStatus,
    };
  });
}
