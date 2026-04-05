/**
 * TDD tests for pushPersonalization service — cm-ako.
 *
 * Personalize push notification content by loyalty tier:
 *   bronze (Trail Blazer 0–499)   → first-purchase nudges, welcome incentives
 *   silver (Mountain Guide 500+)  → early access notifications, shipping perks
 *   gold   (Summit Master 1500+)  → VIP drops, exclusive pricing messaging
 *
 * NotificationType: order_update | promotion | back_in_stock |
 *                   cart_reminder | streak_milestone | quest_complete |
 *                   daily_spin_reminder
 */
import { personalizeNotification, type PersonalizedPushContent } from '../pushPersonalization';
import type { LoyaltyTier } from '@/hooks/useLoyalty';
import type { NotificationType } from '@/services/notifications';

const BRONZE: LoyaltyTier = 'bronze';
const SILVER: LoyaltyTier = 'silver';
const GOLD: LoyaltyTier = 'gold';

// ── Return-shape guard ────────────────────────────────────────────────────────

function assertValidContent(result: PersonalizedPushContent) {
  expect(typeof result.title).toBe('string');
  expect(result.title.length).toBeGreaterThan(0);
  expect(typeof result.body).toBe('string');
  expect(result.body.length).toBeGreaterThan(0);
}

// ── promotion ─────────────────────────────────────────────────────────────────

describe('personalizeNotification — promotion', () => {
  it('bronze: body contains first-purchase or discovery language', () => {
    const result = personalizeNotification('promotion', BRONZE);
    assertValidContent(result);
    expect(result.body).toMatch(/first|welcome|discover/i);
  });

  it('silver: title contains "Early Access"', () => {
    const result = personalizeNotification('promotion', SILVER);
    assertValidContent(result);
    expect(result.title).toMatch(/early access/i);
  });

  it('silver: body references Mountain Guide membership', () => {
    const result = personalizeNotification('promotion', SILVER);
    expect(result.body).toMatch(/mountain guide/i);
  });

  it('gold: title contains VIP or exclusive language', () => {
    const result = personalizeNotification('promotion', GOLD);
    assertValidContent(result);
    expect(result.title).toMatch(/vip|exclusive/i);
  });

  it('gold: body references Summit Master membership', () => {
    const result = personalizeNotification('promotion', GOLD);
    expect(result.body).toMatch(/summit master/i);
  });

  it('bronze and silver produce different titles', () => {
    const b = personalizeNotification('promotion', BRONZE);
    const s = personalizeNotification('promotion', SILVER);
    expect(b.title).not.toBe(s.title);
  });

  it('silver and gold produce different titles', () => {
    const s = personalizeNotification('promotion', SILVER);
    const g = personalizeNotification('promotion', GOLD);
    expect(s.title).not.toBe(g.title);
  });
});

// ── cart_reminder ─────────────────────────────────────────────────────────────

describe('personalizeNotification — cart_reminder', () => {
  it('bronze: body contains first-purchase incentive or welcome offer', () => {
    const result = personalizeNotification('cart_reminder', BRONZE);
    assertValidContent(result);
    expect(result.body).toMatch(/first|welcome|WELCOME10|discount|off/i);
  });

  it('silver: body references free shipping perk', () => {
    const result = personalizeNotification('cart_reminder', SILVER);
    assertValidContent(result);
    expect(result.body).toMatch(/free shipping/i);
  });

  it('gold: body references expedited shipping or VIP perk', () => {
    const result = personalizeNotification('cart_reminder', GOLD);
    assertValidContent(result);
    expect(result.body).toMatch(/expedited|vip|exclusive|free shipping/i);
  });

  it('bronze and silver produce different bodies', () => {
    const b = personalizeNotification('cart_reminder', BRONZE);
    const s = personalizeNotification('cart_reminder', SILVER);
    expect(b.body).not.toBe(s.body);
  });
});

// ── back_in_stock ─────────────────────────────────────────────────────────────

describe('personalizeNotification — back_in_stock', () => {
  it('bronze: returns valid content with "back in stock" or "available" language', () => {
    const result = personalizeNotification('back_in_stock', BRONZE);
    assertValidContent(result);
    expect(result.title + result.body).toMatch(/back in stock|available/i);
  });

  it('silver: title indicates early alert', () => {
    const result = personalizeNotification('back_in_stock', SILVER);
    assertValidContent(result);
    expect(result.title).toMatch(/early|first to know/i);
  });

  it('gold: title or body indicates VIP priority', () => {
    const result = personalizeNotification('back_in_stock', GOLD);
    assertValidContent(result);
    expect(result.title + result.body).toMatch(/vip|priority|summit master/i);
  });

  it('silver gets different content than bronze', () => {
    const b = personalizeNotification('back_in_stock', BRONZE);
    const s = personalizeNotification('back_in_stock', SILVER);
    expect(b.title + b.body).not.toBe(s.title + s.body);
  });
});

// ── non-personalized types (same for all tiers) ───────────────────────────────

describe('personalizeNotification — order_update (not tier-personalized)', () => {
  it('returns valid content for all tiers', () => {
    for (const tier of [BRONZE, SILVER, GOLD] as LoyaltyTier[]) {
      assertValidContent(personalizeNotification('order_update', tier));
    }
  });

  it('all tiers get the same order_update content', () => {
    const results = ([BRONZE, SILVER, GOLD] as LoyaltyTier[]).map((t) =>
      personalizeNotification('order_update', t),
    );
    const titles = new Set(results.map((r) => r.title));
    expect(titles.size).toBe(1);
  });
});

describe('personalizeNotification — gamification types', () => {
  it('streak_milestone: all tiers return valid content', () => {
    for (const tier of [BRONZE, SILVER, GOLD] as LoyaltyTier[]) {
      assertValidContent(personalizeNotification('streak_milestone', tier));
    }
  });

  it('quest_complete: all tiers return valid content', () => {
    for (const tier of [BRONZE, SILVER, GOLD] as LoyaltyTier[]) {
      assertValidContent(personalizeNotification('quest_complete', tier));
    }
  });

  it('daily_spin_reminder: all tiers return valid content', () => {
    for (const tier of [BRONZE, SILVER, GOLD] as LoyaltyTier[]) {
      assertValidContent(personalizeNotification('daily_spin_reminder', tier));
    }
  });
});

// ── context pass-through ──────────────────────────────────────────────────────

describe('personalizeNotification — context pass-through', () => {
  it('context data is merged into returned data field', () => {
    const ctx = { productId: 'prod-123', collectionSlug: 'fall-2026' };
    const result = personalizeNotification('promotion', SILVER, ctx);
    expect(result.data?.productId).toBe('prod-123');
    expect(result.data?.collectionSlug).toBe('fall-2026');
  });

  it('returns no data field when no context provided', () => {
    const result = personalizeNotification('promotion', BRONZE);
    if (result.data !== undefined) {
      expect(Object.keys(result.data).length).toBe(0);
    }
  });

  it('context merged for back_in_stock with product reference', () => {
    const ctx = { productId: 'futon-deluxe' };
    const result = personalizeNotification('back_in_stock', GOLD, ctx);
    expect(result.data?.productId).toBe('futon-deluxe');
  });

  it('context does not overwrite title or body', () => {
    const originalTitle = personalizeNotification('promotion', GOLD).title;
    const ctx = { title: 'injected-title' };
    const result = personalizeNotification('promotion', GOLD, ctx);
    expect(result.title).toBe(originalTitle);
  });
});

// ── return-shape completeness for all type × tier combos ─────────────────────

describe('personalizeNotification — shape for all type × tier combos', () => {
  const types: NotificationType[] = [
    'order_update',
    'promotion',
    'back_in_stock',
    'cart_reminder',
    'streak_milestone',
    'quest_complete',
    'daily_spin_reminder',
  ];

  for (const type of types) {
    for (const tier of [BRONZE, SILVER, GOLD] as LoyaltyTier[]) {
      it(`${type} × ${tier}: returns valid title and body`, () => {
        assertValidContent(personalizeNotification(type, tier));
      });
    }
  }
});
