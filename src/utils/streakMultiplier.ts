/**
 * @module streakMultiplier
 *
 * Streak-based points multiplier tiers — mirrors web gamificationTokens.js
 * STREAK_MULTIPLIER_TIERS (cf-7yu).
 *
 * Tiers:
 *   0–2 days → 1×  (base)
 *   3–6 days → 1.5× (building momentum)
 *   7+ days  → 2×  (max multiplier)
 *
 * cm-7i1y0
 */

export interface StreakMultiplierTier {
  minDays: number;
  multiplier: number;
  label: string;
}

/** Sorted highest-first so getStreakMultiplier can short-circuit on first match. */
export const STREAK_MULTIPLIER_TIERS: StreakMultiplierTier[] = [
  { minDays: 7, multiplier: 2, label: '2× points' },
  { minDays: 3, multiplier: 1.5, label: '1.5× points' },
  { minDays: 0, multiplier: 1, label: 'Base points' },
];

/** Returns the points multiplier for a given streak length in days. */
export function getStreakMultiplier(days: number): number {
  const safeDays = Math.max(0, days);
  const tier = STREAK_MULTIPLIER_TIERS.find((t) => safeDays >= t.minDays);
  return tier?.multiplier ?? 1;
}
