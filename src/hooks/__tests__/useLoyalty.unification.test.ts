import { LOYALTY_TIERS, getTierForPoints, type LoyaltyTierConfig } from '@/data/loyaltyTiers';

describe('Loyalty tier unification', () => {
  it('defines 4 tiers matching web config', () => {
    expect(LOYALTY_TIERS).toHaveLength(4);
    expect(LOYALTY_TIERS.map((t) => t.name)).toEqual([
      'Trail Blazer',
      'Mountain Guide',
      'Summit Master',
      'Blue Ridge Legend',
    ]);
  });

  it('Trail Blazer is 0-499 points', () => {
    expect(getTierForPoints(0).name).toBe('Trail Blazer');
    expect(getTierForPoints(499).name).toBe('Trail Blazer');
  });

  it('Mountain Guide is 500-1499 points', () => {
    expect(getTierForPoints(500).name).toBe('Mountain Guide');
    expect(getTierForPoints(1499).name).toBe('Mountain Guide');
  });

  it('Summit Master is 1500-2999 points', () => {
    expect(getTierForPoints(1500).name).toBe('Summit Master');
    expect(getTierForPoints(2999).name).toBe('Summit Master');
  });

  it('Blue Ridge Legend is 3000+ points', () => {
    expect(getTierForPoints(3000).name).toBe('Blue Ridge Legend');
    expect(getTierForPoints(99999).name).toBe('Blue Ridge Legend');
  });

  it('each tier has perks array', () => {
    for (const tier of LOYALTY_TIERS) {
      expect(Array.isArray(tier.perks)).toBe(true);
      expect(tier.perks.length).toBeGreaterThan(0);
    }
  });

  it('each tier has a color from design tokens', () => {
    for (const tier of LOYALTY_TIERS) {
      expect(tier.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('negative points returns Trail Blazer', () => {
    expect(getTierForPoints(-1).name).toBe('Trail Blazer');
  });

  it('LoyaltyTierConfig type has required shape', () => {
    const t: LoyaltyTierConfig = LOYALTY_TIERS[0];
    expect(typeof t.name).toBe('string');
    expect(typeof t.minPoints).toBe('number');
    expect(typeof t.color).toBe('string');
    expect(typeof t.icon).toBe('string');
    expect(Array.isArray(t.perks)).toBe(true);
  });
});
