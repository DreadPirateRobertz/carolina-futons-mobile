/**
 * @module pushPersonalization
 *
 * Personalizes push notification content by loyalty tier — cm-ako.
 *
 * Tier rules:
 *   bronze (Trail Blazer 0–499)   → first-purchase nudges, welcome incentives
 *   silver (Mountain Guide 500+)  → early access notifications, shipping perks
 *   gold   (Summit Master 1500+)  → VIP drops, exclusive pricing messaging
 *
 * Usage:
 *   const content = personalizeNotification('promotion', tier, { productId: '...' });
 *   // → { title, body, data? }
 */

import type { LoyaltyTier } from '@/hooks/useLoyalty';
import type { NotificationType } from '@/services/notifications';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PersonalizedPushContent {
  title: string;
  body: string;
  data?: Record<string, string>;
}

type TierContentMap = Record<LoyaltyTier, { title: string; body: string }>;

// ── Per-type content by tier ──────────────────────────────────────────────────

const PROMOTION_CONTENT: TierContentMap = {
  bronze: {
    title: 'Something new just dropped',
    body: "Discover our latest futon styles — find your perfect first piece.",
  },
  silver: {
    title: 'Early Access: New Arrivals',
    body: "As a Mountain Guide, you're first to shop the new collection.",
  },
  gold: {
    title: 'VIP Preview: New Drops',
    body: "Summit Master exclusive — shop new arrivals before they go public.",
  },
};

const CART_REMINDER_CONTENT: TierContentMap = {
  bronze: {
    title: 'Your cart is waiting',
    body: 'Complete your first purchase — use WELCOME10 for 10% off.',
  },
  silver: {
    title: 'Your cart is waiting',
    body: 'Free shipping is included with your Mountain Guide membership.',
  },
  gold: {
    title: 'Your cart is waiting',
    body: 'Free expedited shipping is ready on your Summit Master order.',
  },
};

const BACK_IN_STOCK_CONTENT: TierContentMap = {
  bronze: {
    title: 'Back in Stock',
    body: 'An item on your wishlist is available again — grab it while it lasts.',
  },
  silver: {
    title: 'Early Alert: Back in Stock',
    body: "You're first to know — your wishlist item is back and ready to order.",
  },
  gold: {
    title: 'VIP Back in Stock Alert',
    body: 'Summit Masters get priority access — your wishlist item returned.',
  },
};

// ── Non-tier-personalized defaults ───────────────────────────────────────────

const FLAT_CONTENT: Partial<Record<NotificationType, { title: string; body: string }>> = {
  order_update: {
    title: 'Order Update',
    body: 'Your order status has changed. Tap to view the latest update.',
  },
  streak_milestone: {
    title: 'New Streak Milestone!',
    body: "You've hit a new streak milestone. Keep it going!",
  },
  quest_complete: {
    title: 'Quest Complete!',
    body: "You've completed a daily quest and earned bonus points.",
  },
  daily_spin_reminder: {
    title: 'Daily Spin Ready',
    body: "Your daily spin is available — claim your reward now.",
  },
};

// ── Lookup table ──────────────────────────────────────────────────────────────

const TIER_CONTENT: Partial<Record<NotificationType, TierContentMap>> = {
  promotion: PROMOTION_CONTENT,
  cart_reminder: CART_REMINDER_CONTENT,
  back_in_stock: BACK_IN_STOCK_CONTENT,
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return personalized push notification content for the given type and loyalty tier.
 *
 * @param type    - The notification type (e.g. 'promotion', 'cart_reminder')
 * @param tier    - The user's loyalty tier from useLoyalty() ('bronze' | 'silver' | 'gold')
 * @param context - Optional key/value pairs merged into the returned `data` field
 *                  (e.g. { productId: 'futon-123' } for deep-link routing)
 */
export function personalizeNotification(
  type: NotificationType,
  tier: LoyaltyTier,
  context?: Record<string, string>,
): PersonalizedPushContent {
  const tierMap = TIER_CONTENT[type];
  const base: { title: string; body: string } = tierMap
    ? tierMap[tier]
    : FLAT_CONTENT[type] ?? {
        title: 'Carolina Futons',
        body: 'You have a new notification.',
      };

  if (!context || Object.keys(context).length === 0) {
    return { title: base.title, body: base.body };
  }

  return { title: base.title, body: base.body, data: { ...context } };
}
