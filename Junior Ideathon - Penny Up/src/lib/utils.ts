import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Indian Rupee formatting with currency symbol ₹ (e.g. ₹979, ₹1,000, ₹650)
 */
export function formatRupee(amount: number): string {
  const rounded = Math.round(Math.max(0, amount));
  return '₹' + rounded.toLocaleString('en-IN');
}

/**
 * Calculates progress percentage capped at 100% for progress bar
 */
export function calculateProgressPercentage(saved: number, target: number): number {
  if (!target || target <= 0) return 100;
  return Math.min(100, Math.round((saved / target) * 100));
}

/**
 * Checks if a goal is fully completed
 */
export function isGoalCompleted(saved: number, target: number): boolean {
  return saved >= target && target > 0;
}

/**
 * Friendly readable date (e.g. "Today, 4:15 PM" or "Aug 12, 2026")
 */
export function formatFriendlyDate(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return 'Today, ' + date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Calculate weeks needed to reach a target based on weekly savings amount
 */
export function calculatePace(remaining: number, weeklyAmount: number): { weeks: number; targetDate: string } {
  if (remaining <= 0) return { weeks: 0, targetDate: 'Goal Completed!' };
  const safeWeekly = Math.max(10, weeklyAmount);
  const weeks = Math.ceil(remaining / safeWeekly);
  
  const targetDateObj = new Date();
  targetDateObj.setDate(targetDateObj.getDate() + weeks * 7);
  const targetDate = targetDateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  
  return { weeks, targetDate };
}
