'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useShop, PlaceResult } from '@/lib/store';
import { ZoneId, getProductById, Product } from '@/lib/products';
import { playCelebrateFanfare, playScanBeep, playSuccessChime, playWarningBuzz } from '@/lib/sound';

export interface GameFeedback extends PlaceResult {
  id: number;
  productName: string;
}

/**
 * Warehouse game rules shared by the 3D scene and the simple shelf view.
 * Everything is written to the shared shop store, so the scanner, My Stock and the
 * dashboard always agree with the game.
 */
export function useWarehouseGame() {
  const markScanned = useShop((s) => s.markScanned);
  const placeProduct = useShop((s) => s.placeProduct);
  const handoffId = useShop((s) => s.handoffId);
  const setHandoff = useShop((s) => s.setHandoff);

  const [carryingId, setCarryingId] = useState<string | null>(null);
  const [scanCardId, setScanCardId] = useState<string | null>(null);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<GameFeedback | null>(null);
  const [lastPlaced, setLastPlaced] = useState<{ id: string; zone: ZoneId; at: number } | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>();

  // A product handed over from the real scanner starts in the shopkeeper's hands.
  useEffect(() => {
    if (handoffId) {
      setCarryingId(handoffId);
      setScanCardId(handoffId);
    }
  }, [handoffId]);

  const scan = useCallback(
    (productId: string) => {
      if (scanningId) return;
      setScanningId(productId);
      playScanBeep();
      // Short scanner animation, then the product info appears.
      setTimeout(() => {
        markScanned(productId);
        setScanningId(null);
        setScanCardId(productId);
        setCarryingId(productId);
        playSuccessChime();
      }, 650);
    },
    [markScanned, scanningId]
  );

  const place = useCallback(
    (zone: ZoneId) => {
      if (!carryingId) return null;
      const product = getProductById(carryingId) as Product;
      const result = placeProduct(carryingId, zone);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      setFeedback({ ...result, id: Date.now(), productName: product.name });
      feedbackTimer.current = setTimeout(() => setFeedback(null), result.correct ? 2600 : 3200);

      if (result.correct) {
        playSuccessChime();
        setLastPlaced({ id: carryingId, zone, at: Date.now() });
        setCarryingId(null);
        setScanCardId(null);
        if (handoffId === carryingId) setHandoff(null);
        if (result.allOrganized) {
          setTimeout(() => {
            playCelebrateFanfare();
            setShowComplete(true);
            try {
              confetti({
                particleCount: 90,
                spread: 75,
                origin: { y: 0.55 },
                shapes: ['circle', 'square'],
                colors: ['#2F8F55', '#5DB277', '#F2A516', '#E4572E', '#F8EEDB', '#95C8EA'],
                disableForReducedMotion: true,
              });
            } catch {
              /* decorative only */
            }
          }, 700);
        }
      } else {
        playWarningBuzz();
      }
      return result;
    },
    [carryingId, placeProduct, handoffId, setHandoff]
  );

  const dismissScanCard = useCallback(() => setScanCardId(null), []);

  return {
    carryingId,
    scanCardId,
    scanningId,
    feedback,
    lastPlaced,
    showComplete,
    setShowComplete,
    scan,
    place,
    dismissScanCard,
  };
}

export type WarehouseGame = ReturnType<typeof useWarehouseGame>;
