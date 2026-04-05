/**
 * TDD tests for pushPersonalization service — cm-ako.
 *
 * Personalize push notification content by loyalty tier:
 *   trail-blazer      (Trail Blazer 0–499)      → first-purchase nudges, welcome incentives
 *   mountain-guide    (Mountain Guide 500–1499)  → early access notifications, shipping perks
 *   summit-master     (Summit Master 1500–2999)  → VIP drops, exclusive pricing messaging
 *   blue-ridge-legend (Blue Ridge Legend 3000+)  → VIP drops, concierge messaging
 *   null (guest / no-tier)                       → generic content, not personalized
 *
 * Acceptance criteria (cm-ako):
 *   1. Each tier gets correct template
 *   2. No-tier guest (null) gets generic content
 *   3. Opt-out is respected via getPersonalizedPushIfAllowed
 */
import {
  personalizeNotification,
  getPersonalizedPushIfAllowed,
  type PersonalizedPushContent,
} from '../pushPersonalization';
import { LOYALTY_TIERS } from '@/data/loyaltyTiers';
import type { LoyaltyTierConfig } from '@/data/loyaltyTiers';
import type { NotificationType, NotificationPreferences } from '@/services/notifications';

const BRONZE: LoyaltyTierConfig = LOYALTY_TIERS[0]; // Trail Blazer
const SILVER: LoyaltyTierConfig = LOYALTY_TIERS[1]; // Mountain Guide
const GOLD: LoyaltyTierConfig = LOYALTY_TIERS[2]; // Summit Master
const LEGEND: LoyaltyTierConfig = LOYALTY_TIERS[3]; // Blue Ridge Legend

const ALL_PREFS_ON: NotificationPreferences = {
  orderUpdates: true,
  promotions: true,
  backInStock: true,
  priceDropAlerts: true,
  cartReminders: true,
  cartRecovery: true,
  streakMilestone: true,
  questComplete: true,
  dailySpinReminder: true,
};

const ALL_PREFS_OFF: NotificationPreferences = {
  orderUpdates: false,
  promotions: false,
  backInStock: false,
  priceDropAlerts: false,
  cartReminders: false,
  cartRecovery: false,
  streakMilestone: false,
  questComplete: false,
  dailySpinReminder: false,
};

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
    for (const tier of LOYALTY_TIERS) {
      assertValidContent(personalizeNotification('order_update', tier));
    }
  });

  it('all tiers get the same order_update content', () => {
    const results = ([BRONZE, SILVER, GOLD] as LoyaltyTierConfig[]).map((t) =>
      personalizeNotification('order_update', t),
    );
    const titles = new Set(results.map((r) => r.title));
    expect(titles.size).toBe(1);
  });
});

describe('personalizeNotification — gamification types', () => {
  it('streak_milestone: all tiers return valid content', () => {
    for (const tier of LOYALTY_TIERS) {
      assertValidContent(personalizeNotification('streak_milestone', tier));
    }
  });

  it('quest_complete: all tiers return valid content', () => {
    for (const tier of LOYALTY_TIERS) {
      assertValidContent(personalizeNotification('quest_complete', tier));
    }
  });

  it('daily_spin_reminder: all tiers return valid content', () => {
    for (const tier of LOYALTY_TIERS) {
      assertValidContent(personalizeNotification('daily_spin_reminder', tier));
    }
  });
});

// ── guest (null tier) → generic content ──────────────────────────────────────

describe('personalizeNotification — guest (null tier)', () => {
  it('returns valid content when tier is null', () => {
    assertValidContent(personalizeNotification('promotion', null));
  });

  it('null tier returns generic (non-tier-personalized) content for promotion', () => {
    const guest = personalizeNotification('promotion', null);
    // Guest content must differ from all tier-specific content
    for (const tier of LOYALTY_TIERS) {
      const tiered = personalizeNotification('promotion', tier);
      expect(guest.title).not.toBe(tiered.title);
    }
  });

  it('null tier for cart_reminder returns generic content', () => {
    const result = personalizeNotification('cart_reminder', null);
    assertValidContent(result);
    // Should not reference tier-specific perks
    expect(result.body).not.toMatch(/mountain guide|summit master|WELCOME10/i);
  });

  it('null tier for back_in_stock returns valid generic content', () => {
    assertValidContent(personalizeNotification('back_in_stock', null));
  });

  it('null tier for order_update returns same content as tiered (flat type)', () => {
    const guest = personalizeNotification('order_update', null);
    const tiered = personalizeNotification('order_update', GOLD); // order_update is flat — same for all tiers
    expect(guest.title).toBe(tiered.title);
    expect(guest.body).toBe(tiered.body);
  });

  it('null tier returns valid content for all notification types', () => {
    const types: NotificationType[] = [
      'order_update',
      'promotion',
      'back_in_stock',
      'cart_reminder',
      'cart_recovery',
      'streak_milestone',
      'quest_complete',
      'daily_spin_reminder',
    ];
    for (const type of types) {
      assertValidContent(personalizeNotification(type, null));
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

  it('null tier with context merges data correctly', () => {
    const ctx = { productId: 'guest-product' };
    const result = personalizeNotification('promotion', null, ctx);
    expect(result.data?.productId).toBe('guest-product');
  });
});

// ── opt-out: getPersonalizedPushIfAllowed ─────────────────────────────────────

describe('getPersonalizedPushIfAllowed — opt-out respected', () => {
  it('returns content when notification type is enabled in prefs', () => {
    const result = getPersonalizedPushIfAllowed('promotion', SILVER, ALL_PREFS_ON);
    expect(result).not.toBeNull();
    assertValidContent(result!);
  });

  it('returns null when promotion is opted out', () => {
    const prefs = { ...ALL_PREFS_ON, promotions: false };
    const result = getPersonalizedPushIfAllowed('promotion', SILVER, prefs);
    expect(result).toBeNull();
  });

  it('returns null when cart_reminder is opted out', () => {
    const prefs = { ...ALL_PREFS_ON, cartReminders: false };
    const result = getPersonalizedPushIfAllowed('cart_reminder', BRONZE, prefs);
    expect(result).toBeNull();
  });

  it('returns null when back_in_stock is opted out', () => {
    const prefs = { ...ALL_PREFS_ON, backInStock: false };
    const result = getPersonalizedPushIfAllowed('back_in_stock', GOLD, prefs);
    expect(result).toBeNull();
  });

  it('returns null when order_update is opted out', () => {
    const prefs = { ...ALL_PREFS_ON, orderUpdates: false };
    const result = getPersonalizedPushIfAllowed('order_update', BRONZE, prefs);
    expect(result).toBeNull();
  });

  it('returns null when streak_milestone is opted out', () => {
    const prefs = { ...ALL_PREFS_ON, streakMilestone: false };
    const result = getPersonalizedPushIfAllowed('streak_milestone', GOLD, prefs);
    expect(result).toBeNull();
  });

  it('returns null for all types when all prefs are off', () => {
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
      const result = getPersonalizedPushIfAllowed(type, GOLD, ALL_PREFS_OFF);
      expect(result).toBeNull();
    }
  });

  it('returns content for all types when all prefs are on', () => {
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
      const result = getPersonalizedPushIfAllowed(type, BRONZE, ALL_PREFS_ON);
      expect(result).not.toBeNull();
      assertValidContent(result!);
    }
  });

  it('works with null (guest) tier when allowed', () => {
    const result = getPersonalizedPushIfAllowed('promotion', null, ALL_PREFS_ON);
    expect(result).not.toBeNull();
    assertValidContent(result!);
  });

  it('returns null for guest when opted out', () => {
    const prefs = { ...ALL_PREFS_ON, promotions: false };
    const result = getPersonalizedPushIfAllowed('promotion', null, prefs);
    expect(result).toBeNull();
  });

  it('passes context through when allowed', () => {
    const ctx = { productId: 'abc-123' };
    const result = getPersonalizedPushIfAllowed('promotion', SILVER, ALL_PREFS_ON, ctx);
    expect(result?.data?.productId).toBe('abc-123');
  });

  it('context is not leaked when opted out', () => {
    const prefs = { ...ALL_PREFS_ON, promotions: false };
    const ctx = { productId: 'abc-123' };
    const result = getPersonalizedPushIfAllowed('promotion', SILVER, prefs, ctx);
    expect(result).toBeNull();
  });
});

// ── return-shape completeness for all type × tier combos ─────────────────────

describe('personalizeNotification — shape for all type × tier combos', () => {
  const types: NotificationType[] = [
    'order_update',
    'promotion',
    'back_in_stock',
    'cart_reminder',
    'cart_recovery',
    'streak_milestone',
    'quest_complete',
    'daily_spin_reminder',
  ];

  for (const type of types) {
    for (const tier of [...LOYALTY_TIERS, null] as (LoyaltyTierConfig | null)[]) {
      it(`${type} × ${tier?.icon ?? 'guest'}: returns valid title and body`, () => {
        assertValidContent(personalizeNotification(type, tier));
      });
    }
  }
});
