/**
 * Push notification service using expo-notifications.
 *
 * expo-notifications alone suffices for our needs:
 * - Handles both iOS (APNs) and Android (FCM) via Expo push service
 * - No need for OneSignal/FCM directly — Expo push API handles routing
 * - Scales well with Expo push receipts for delivery confirmation
 *
 * For production: register push token with backend, backend sends via
 * Expo push API (https://expo.dev/push). This module handles client-side.
 */
import { Platform } from 'react-native';

export type NotificationType =
  | 'order_update'
  | 'promotion'
  | 'back_in_stock'
  | 'price_drop'
  | 'cart_reminder'
  | 'cart_recovery'
  | 'streak_milestone'
  | 'quest_complete'
  | 'daily_spin_reminder';

export interface NotificationPreferences {
  orderUpdates: boolean;
  promotions: boolean;
  backInStock: boolean;
  priceDropAlerts: boolean;
  cartReminders: boolean;
  cartRecovery: boolean;
  streakMilestone: boolean;
  questComplete: boolean;
  dailySpinReminder: boolean;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  orderUpdates: true,
  promotions: true,
  backInStock: true,
  priceDropAlerts: true,
  cartReminders: false,
  cartRecovery: false,
  streakMilestone: true,
  questComplete: true,
  dailySpinReminder: false,
};

export interface PushNotificationData {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/** Map notification type to deep link route */
export function getDeepLinkForNotification(
  type: NotificationType,
  data?: Record<string, string>,
): string {
  // Try direct payload keys first (snake_case from push payload)
  const payloadLink = getDeepLinkFromPayload(data);
  if (payloadLink) return payloadLink;

  switch (type) {
    case 'order_update':
      return data?.orderId ? `carolinafutons://orders/${data.orderId}` : 'carolinafutons://orders';
    case 'promotion':
      return data?.productId
        ? `carolinafutons://product/${data.productId}`
        : 'carolinafutons://shop';
    case 'back_in_stock':
      return data?.productId
        ? `carolinafutons://product/${data.productId}`
        : 'carolinafutons://wishlist';
    case 'price_drop':
      return data?.product_slug
        ? `carolinafutons://product/${data.product_slug}`
        : 'carolinafutons://shop';
    case 'cart_reminder':
    case 'cart_recovery':
      return 'carolinafutons://cart';
    case 'streak_milestone':
      return 'carolinafutons://challenges';
    case 'quest_complete':
      return 'carolinafutons://challenges';
    case 'daily_spin_reminder':
      return 'carolinafutons://daily-spin';
    default:
      return 'carolinafutons://home';
  }
}

/**
 * Resolve a deep link directly from notification data payload keys.
 * Supports: product_id, order_id, collection_slug, promo.
 * Returns null if no recognized key is found.
 */
export function getDeepLinkFromPayload(data?: Record<string, string>): string | null {
  if (!data) return null;

  if (data.product_id) return `carolinafutons://product/${data.product_id}`;
  if (data.order_id) return `carolinafutons://orders/${data.order_id}`;
  if (data.collection_slug) return `carolinafutons://collections/${data.collection_slug}`;
  if (data.promo) return `carolinafutons://home?promo=${data.promo}`;

  return null;
}

/** Notification type label for preferences UI */
export const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationType,
  { label: string; description: string; prefKey: keyof NotificationPreferences }
> = {
  order_update: {
    label: 'Order Updates',
    description: 'Get notified when your order ships or is delivered',
    prefKey: 'orderUpdates',
  },
  promotion: {
    label: 'Promotions',
    description: 'Sales, new arrivals, and exclusive offers',
    prefKey: 'promotions',
  },
  back_in_stock: {
    label: 'Back in Stock',
    description: 'Alerts when wishlisted items are available again',
    prefKey: 'backInStock',
  },
  price_drop: {
    label: 'Price Drop Alerts',
    description: 'Notify me when items I want drop in price',
    prefKey: 'priceDropAlerts',
  },
  cart_reminder: {
    label: 'Cart Reminders',
    description: 'Gentle nudge when you have items waiting in your cart',
    prefKey: 'cartReminders',
  },
  cart_recovery: {
    label: 'Cart Recovery',
    description: 'Reminder to complete your purchase after leaving items in your cart',
    prefKey: 'cartRecovery',
  },
  streak_milestone: {
    label: 'Streak Milestones',
    description: 'Celebrate hitting a new streak milestone',
    prefKey: 'streakMilestone',
  },
  quest_complete: {
    label: 'Quest Complete',
    description: 'Get notified when you complete a daily quest',
    prefKey: 'questComplete',
  },
  daily_spin_reminder: {
    label: 'Daily Spin',
    description: 'Reminder to claim your daily spin reward',
    prefKey: 'dailySpinReminder',
  },
};

/** Check if a notification should be shown based on user preferences */
export function shouldShowNotification(
  type: NotificationType,
  prefs: NotificationPreferences,
): boolean {
  const config = NOTIFICATION_TYPE_CONFIG[type];
  return prefs[config.prefKey];
}

type RegisterCallFn = (path: string, method: 'POST', body: unknown) => Promise<unknown>;

/**
 * Register an Expo push token against a member ID via the Wix serverless function.
 * Retry behaviour is delegated to the caller's wixClient (which uses withRetry internally).
 * The memberId MUST come from an authenticated session — callers enforce the IDOR guard.
 */
export async function registerPushToken(
  token: string,
  memberId: string,
  callFn: RegisterCallFn,
): Promise<void> {
  await callFn('/_functions/registerPushToken', 'POST', {
    memberId,
    token,
    platform: Platform.OS,
  });
}

/**
 * Android notification channel configuration.
 * Each notification type maps to a dedicated channel with appropriate importance.
 */
export interface AndroidChannelConfig {
  id: string;
  name: string;
  description: string;
  importance: number; // Maps to Notifications.AndroidImportance at runtime
}

// Importance values match expo-notifications AndroidImportance enum:
// MAX=5, HIGH=4, DEFAULT=3, LOW=2, MIN=1
export const ANDROID_CHANNEL_CONFIG: Record<NotificationType, AndroidChannelConfig> = {
  order_update: {
    id: 'orders',
    name: 'Order Updates',
    description: 'Shipping confirmations, delivery updates, and order status changes',
    importance: 4, // HIGH — order updates are time-sensitive
  },
  promotion: {
    id: 'promotions',
    name: 'Promotions',
    description: 'Sales, new arrivals, and exclusive offers',
    importance: 3, // DEFAULT — marketing notifications
  },
  back_in_stock: {
    id: 'back-in-stock',
    name: 'Back in Stock',
    description: 'Alerts when wishlisted items are available again',
    importance: 3, // DEFAULT — useful but not urgent
  },
  price_drop: {
    id: 'price-drops',
    name: 'Price Drop Alerts',
    description: 'Alerts when a subscribed product drops in price',
    importance: 4, // HIGH — actionable, time-sensitive savings opportunity
  },
  cart_reminder: {
    id: 'cart-reminders',
    name: 'Cart Reminders',
    description: 'Reminders about items waiting in your cart',
    importance: 2, // LOW — gentle nudges should not be intrusive
  },
  cart_recovery: {
    id: 'cart-recovery',
    name: 'Cart Recovery',
    description: 'Recovery notifications for abandoned carts',
    importance: 2, // LOW — recovery nudges should not be intrusive
  },
  streak_milestone: {
    id: 'streak-milestones',
    name: 'Streak Milestones',
    description: 'Celebration notifications for streak milestone achievements',
    importance: 4, // HIGH — achievement moments should feel rewarding
  },
  quest_complete: {
    id: 'quest-complete',
    name: 'Quest Complete',
    description: 'Notifications when daily quests are completed',
    importance: 3, // DEFAULT — positive feedback, not urgent
  },
  daily_spin_reminder: {
    id: 'daily-spin',
    name: 'Daily Spin',
    description: 'Reminder to claim your daily spin reward',
    importance: 2, // LOW — opt-in reminder, should not be intrusive
  },
};

/** Get the Android channel ID for a given notification type */
export function getChannelId(type: NotificationType): string {
  return ANDROID_CHANNEL_CONFIG[type].id;
}

/** Format badge count — returns undefined if 0 */
export function formatBadgeCount(count: number): number | undefined {
  return count > 0 ? Math.min(count, 99) : undefined;
}
