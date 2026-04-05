/**
 * loyaltyTiers — deacon-cjv, cm-2qq
 *
 * Shared 4-tier loyalty configuration aligned with web's gamificationTokens.
 * Thresholds: Trail Blazer (0-499) / Mountain Guide (500-1499) /
 *             Summit Master (1500-2999) / Blue Ridge Legend (3000+)
 *
 * earnRate: points earned per dollar spent. Mirrors the LoyaltyTiers Wix
 * collection field. Base rate 0.06 (Trail Blazer 1×), multiplied per tier.
 */

export interface LoyaltyTierConfig {
  name: string;
  minPoints: number;
  color: string;
  icon: string;
  perks: string[];
  /** Points earned per dollar spent. Base 0.06 × tier multiplier. */
  earnRate: number;
}

export const LOYALTY_TIERS: LoyaltyTierConfig[] = [
  {
    name: 'Trail Blazer',
    minPoints: 0,
    color: '#8B7355',
    icon: 'trail-blazer',
    earnRate: 0.06,
    perks: ['Earn 1 point per $1 spent', 'Birthday bonus points'],
  },
  {
    name: 'Mountain Guide',
    minPoints: 500,
    color: '#5B8FA8',
    icon: 'mountain-guide',
    earnRate: 0.09,
    perks: ['Earn 1.5x points per $1', 'Free standard shipping', 'Early access to sales'],
  },
  {
    name: 'Summit Master',
    minPoints: 1500,
    color: '#E8845C',
    icon: 'summit-master',
    earnRate: 0.12,
    perks: [
      'Earn 2x points per $1',
      'Free expedited shipping',
      'Free styling consultation',
      'Exclusive member pricing',
    ],
  },
  {
    name: 'Blue Ridge Legend',
    minPoints: 3000,
    color: '#C9A84C',
    icon: 'blue-ridge-legend',
    earnRate: 0.18,
    perks: [
      'Earn 3x points per $1',
      'Free white-glove delivery',
      'Dedicated concierge',
      'Annual loyalty gift',
      'Early access to new products',
    ],
  },
];

/**
 * Calculate earn points for a given price and tier earn rate.
 * Floors the result — loyalty systems never award fractional points.
 */
export function calcTieredPoints(price: number, earnRate: number): number {
  return Math.floor(Math.max(0, price) * earnRate);
}

/** Return the tier config for a given points value. Always returns a valid tier. */
export function getTierForPoints(points: number): LoyaltyTierConfig {
  const safePoints = Math.max(0, points);
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    if (safePoints >= LOYALTY_TIERS[i].minPoints) {
      return LOYALTY_TIERS[i];
    }
  }
  return LOYALTY_TIERS[0];
}

/** Return the next tier after the given tier, or null if already at max. */
export function getNextTier(tier: LoyaltyTierConfig): LoyaltyTierConfig | null {
  const index = LOYALTY_TIERS.indexOf(tier);
  return index >= 0 && index < LOYALTY_TIERS.length - 1 ? LOYALTY_TIERS[index + 1] : null;
}
