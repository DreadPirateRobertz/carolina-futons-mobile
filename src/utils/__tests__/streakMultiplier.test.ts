/**
 * @module streakMultiplier.test
 *
 * Tests for getStreakMultiplier() utility matching web gamificationTokens.js
 * STREAK_MULTIPLIER_TIERS (cf-7yu / cm-7i1y0).
 *
 * Tiers:
 *   0–2 days → 1×
 *   3–6 days → 1.5×
 *   7+ days  → 2×
 */

import { getStreakMultiplier, STREAK_MULTIPLIER_TIERS } from '../streakMultiplier';

describe('getStreakMultiplier', () => {
  it('returns 1× for streak of 0 days', () => {
    expect(getStreakMultiplier(0)).toBe(1);
  });

  it('returns 1× for streak of 1 day', () => {
    expect(getStreakMultiplier(1)).toBe(1);
  });

  it('returns 1× for streak of 2 days', () => {
    expect(getStreakMultiplier(2)).toBe(1);
  });

  it('returns 1.5× for streak of 3 days', () => {
    expect(getStreakMultiplier(3)).toBe(1.5);
  });

  it('returns 1.5× for streak of 6 days', () => {
    expect(getStreakMultiplier(6)).toBe(1.5);
  });

  it('returns 2× for streak of 7 days', () => {
    expect(getStreakMultiplier(7)).toBe(2);
  });

  it('returns 2× for streak of 30 days', () => {
    expect(getStreakMultiplier(30)).toBe(2);
  });

  it('returns 1× for negative values', () => {
    expect(getStreakMultiplier(-1)).toBe(1);
  });

  it('returns 2× for very large streak', () => {
    expect(getStreakMultiplier(365)).toBe(2);
  });
});

describe('STREAK_MULTIPLIER_TIERS', () => {
  it('has exactly 3 tiers', () => {
    expect(STREAK_MULTIPLIER_TIERS).toHaveLength(3);
  });

  it('tiers are sorted by minDays descending (highest first)', () => {
    for (let i = 1; i < STREAK_MULTIPLIER_TIERS.length; i++) {
      expect(STREAK_MULTIPLIER_TIERS[i - 1].minDays).toBeGreaterThan(
        STREAK_MULTIPLIER_TIERS[i].minDays,
      );
    }
  });

  it('all multipliers are >= 1', () => {
    STREAK_MULTIPLIER_TIERS.forEach((tier) => {
      expect(tier.multiplier).toBeGreaterThanOrEqual(1);
    });
  });
});
