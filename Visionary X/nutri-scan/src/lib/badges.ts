import type { FoodItem, ScanHistoryEntry, UsageEntry } from '@/types';
import { toIsoDate } from '@/lib/expiry';

/**
 * Achievements are computed from what actually happened (scans, food, usage) — never faked.
 */
export interface Badge {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

export const BADGES: Badge[] = [
  { id: 'first_scan', emoji: '📸', title: 'First Scan', description: 'Scanned your first item.' },
  { id: 'curious', emoji: '🔍', title: 'Curious Mind', description: 'Challenged the scanner with something that isn’t food.' },
  { id: 'label_reader', emoji: '🏷️', title: 'Label Reader', description: 'Saved a food with nutrition read from its label.' },
  { id: 'stocked_up', emoji: '🧺', title: 'Stocked Up', description: 'Added 5 foods to My Food.' },
  { id: 'food_saver', emoji: '🌱', title: 'Food Saver', description: 'Used something up before it expired.' },
  { id: 'streak_3', emoji: '🔥', title: '3-Day Streak', description: 'Scanned food 3 days in a row.' },
  { id: 'zero_waste_week', emoji: '♻️', title: 'Zero-Waste Week', description: '3 foods used in time and nothing wasted in 7 days.' },
  { id: 'kitchen_master', emoji: '👩‍🍳', title: 'Kitchen Master', description: 'Sorted the Smart Kitchen with 3 stars.' },
];

export function scanStreak(scans: ScanHistoryEntry[], today: Date = new Date()): number {
  const days = new Set(scans.map((s) => toIsoDate(new Date(s.at))));
  let streak = 0;
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!days.has(toIsoDate(d))) d.setDate(d.getDate() - 1); // streak still alive until the day ends
  while (days.has(toIsoDate(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function earnedBadges(data: { foods: FoodItem[]; usage: UsageEntry[]; scans: ScanHistoryEntry[]; kitchenBestStars: number }, now: Date = new Date()): string[] {
  const { foods, usage, scans, kitchenBestStars } = data;
  const earned: string[] = [];
  if (scans.length > 0) earned.push('first_scan');
  if (scans.some((s) => s.type === 'non_food')) earned.push('curious');
  if (foods.some((f) => f.nutrition?.source === 'label')) earned.push('label_reader');
  if (foods.filter((f) => !f.sample).length >= 5) earned.push('stocked_up');
  if (usage.some((u) => u.kind === 'used' && u.beforeExpiry === true)) earned.push('food_saver');
  if (scanStreak(scans, now) >= 3) earned.push('streak_3');
  const weekAgo = now.getTime() - 7 * 86_400_000;
  const week = usage.filter((u) => new Date(u.at).getTime() >= weekAgo);
  if (new Set(week.filter((u) => u.kind === 'used' && u.beforeExpiry === true).map((u) => u.foodId)).size >= 3 && !week.some((u) => u.kind === 'wasted')) earned.push('zero_waste_week');
  if (kitchenBestStars >= 3) earned.push('kitchen_master');
  return earned;
}
