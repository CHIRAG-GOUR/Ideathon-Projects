import type { ConfidenceLevel, Product, RecognitionResult, ScanResult } from '@/types';
import { CATEGORY_META } from '@/lib/food/meta';
import { computeNutriScore } from '@/lib/nutrition/score';
import { funMessageFor } from './funMessages';

/** Confidence tiers: high → show; medium → "Looks like… is this right?"; low → ask to retake. */
export const HIGH_CONFIDENCE = 0.8;
export const MIN_CONFIDENCE = 0.5;

export function confidenceLevel(c: number): ConfidenceLevel {
  if (c >= HIGH_CONFIDENCE) return 'high';
  if (c >= MIN_CONFIDENCE) return 'medium';
  return 'low';
}

export function productFromRecognition(r: RecognitionResult): Product {
  const category = r.foodCategory ?? 'other';
  return {
    name: r.name,
    brand: r.brand,
    category,
    quantityText: r.quantityText,
    storage: r.storageSuggestion ?? CATEGORY_META[category].storage,
    storageTip: r.storageTip,
    expiryDate: r.expiryDate,
    expirySource: r.expiryDate ? 'label' : null,
    manufactureDate: r.manufactureDate,
    nutrition: r.nutrition,
    ingredients: r.ingredients,
    ingredientsSource: r.ingredientsSource,
    allergens: r.allergens,
    isPackaged: r.isPackaged,
    description: r.description,
    isMeal: r.isMeal ?? false,
    cuisine: r.cuisine ?? null,
    dietType: r.dietType ?? 'unknown',
  };
}

/** Turn a validated recognition into the single result type the UI renders. */
export function classifyRecognition(r: RecognitionResult): ScanResult {
  const level = confidenceLevel(r.confidence);
  if (r.objectType === 'unknown' || level === 'low') {
    return {
      type: 'unknown',
      confidence: r.confidence,
      reason: r.objectType === 'unknown' || r.name === 'Unknown' ? 'I couldn’t identify this clearly.' : `It might be ${article(r.name)} ${r.name.toLowerCase()}, but I’m not sure.`,
    };
  }
  if (r.objectType === 'food') {
    const product = productFromRecognition(r);
    return {
      type: 'food',
      product,
      score: computeNutriScore(product.nutrition, product.category, product.name),
      confidence: r.confidence,
      confidenceLevel: level,
      emoji: r.emoji ?? CATEGORY_META[product.category].emoji,
    };
  }
  const fun = funMessageFor(r.kind);
  return {
    type: 'non_food',
    object: r.name,
    kind: r.kind,
    category: r.kind === 'person' ? null : r.category,
    confidence: r.confidence,
    funTitle: fun.title,
    funMessage: fun.message,
    emoji: fun.emoji ?? r.emoji ?? '🔎',
  };
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}
