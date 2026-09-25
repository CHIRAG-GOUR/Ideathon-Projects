import { create } from 'zustand';
import { DemoProduct, ShelfZone, INITIAL_DEMO_PRODUCTS } from './products';

interface DemoStoreState {
  products: DemoProduct[];
  points: number;
  lastScannedProduct: DemoProduct | null;
  selectedProductId: string | null;
  showDemoGuide: boolean;

  // Actions
  scanProductByBarcode: (barcode: string) => { found: boolean; product: DemoProduct | null; error?: string };
  arrangeProductToZone: (productId: string, zone: ShelfZone) => { correct: boolean; message: string; pointsEarned: number };
  setSelectedProductId: (id: string | null) => void;
  clearLastScanned: () => void;
  toggleDemoGuide: () => void;
  resetDemo: () => void;
}

export const useGroceryStore = create<DemoStoreState>((set, get) => ({
  products: INITIAL_DEMO_PRODUCTS,
  points: 0,
  lastScannedProduct: null,
  selectedProductId: null,
  showDemoGuide: false,

  scanProductByBarcode: (barcode: string) => {
    const cleanBarcode = barcode.trim();
    const { products, points } = get();
    const foundProduct = products.find((p) => p.barcode === cleanBarcode);

    if (!foundProduct) {
      return { found: false, product: null, error: `Barcode ${cleanBarcode} not found in demo stock.` };
    }

    const isFirstScan = !foundProduct.scanned;
    const bonusPoints = isFirstScan ? 50 : 0;

    const updatedProducts = products.map((p) =>
      p.id === foundProduct.id ? { ...p, scanned: true } : p
    );

    set({
      products: updatedProducts,
      lastScannedProduct: { ...foundProduct, scanned: true },
      selectedProductId: foundProduct.id,
      points: points + bonusPoints,
    });

    return { found: true, product: { ...foundProduct, scanned: true } };
  },

  arrangeProductToZone: (productId: string, zone: ShelfZone) => {
    const { products, points } = get();
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return { correct: false, message: 'Product not found.', pointsEarned: 0 };
    }

    const isCorrect = zone === product.idealZone;
    const isFirstCorrectPlacement = isCorrect && !product.placedCorrectly;
    const pointsEarned = isFirstCorrectPlacement ? 100 : 0;

    const updatedProducts = products.map((p) =>
      p.id === productId
        ? {
            ...p,
            currentZone: zone,
            placedCorrectly: isCorrect,
          }
        : p
    );

    // Check if all 6 are organized correctly
    const allOrganized = updatedProducts.every((p) => p.placedCorrectly);
    const completionBonus = allOrganized && !products.every((p) => p.placedCorrectly) ? 500 : 0;

    set({
      products: updatedProducts,
      points: points + pointsEarned + completionBonus,
    });

    let message = '';
    if (isCorrect) {
      if (zone === 'SELL_FIRST') {
        message = `✓ Great job! ${product.name} expires in ${product.daysUntilExpiry} days, so it belongs in SELL FIRST.`;
      } else if (zone === 'SELL_SOON') {
        message = `✓ Perfect! ${product.name} belongs in the middle SELL SOON watch zone.`;
      } else {
        message = `✓ Excellent! ${product.name} has long shelf life, so it belongs in FRESH STORAGE.`;
      }
    } else {
      message = `Almost! Check the expiry date of ${product.name} (${product.shelfLifeText}).`;
    }

    return { correct: isCorrect, message, pointsEarned: pointsEarned + completionBonus };
  },

  setSelectedProductId: (id) => set({ selectedProductId: id }),
  clearLastScanned: () => set({ lastScannedProduct: null }),
  toggleDemoGuide: () => set((state) => ({ showDemoGuide: !state.showDemoGuide })),

  resetDemo: () =>
    set({
      products: INITIAL_DEMO_PRODUCTS.map((p) => ({
        ...p,
        scanned: false,
        placedCorrectly: false,
        currentZone: 'UNASSIGNED',
      })),
      points: 0,
      lastScannedProduct: null,
      selectedProductId: null,
    }),
}));
