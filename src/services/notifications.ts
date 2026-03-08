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

export type NotificationType = 'order_update' | 'promotion' | 'back_in_stock' | 'cart_reminder';

export interface NotificationPreferences {
  orderUpdates: boolean;
  promotions: boolean;
  backInStock: boolean;
  cartReminders: boolean;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  orderUpdates: true,
  promotions: true,
  backInStock: true,
  cartReminders: false,
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
    case 'cart_reminder':
      return 'carolinafutons://cart';
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
  cart_reminder: {
    label: 'Cart Reminders',
    description: 'Gentle nudge when you have items waiting in your cart',
    prefKey: 'cartReminders',
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

const PUSH_TOKEN_ENDPOINT = 'https://www.wixapis.com/v1/push-tokens';
const MAX_RETRIES = 3;

/**
 * Register an Expo push token with the backend for push notification delivery.
 * Retries on network errors with exponential backoff. Does not retry 4xx client errors.
 */
export async function registerPushToken(token: string): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(PUSH_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, platform: Platform.OS }),
      });

      if (response.ok) return;

      // Don't retry client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Push token registration failed: ${response.status}`);
      }

      lastError = new Error(`Push token registration failed: ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Client errors thrown above should not be retried
      if (lastError.message.includes('registration failed')) {
        throw lastError;
      }
    }

    // Exponential backoff before retry
    if (attempt < MAX_RETRIES - 1) {
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  throw lastError ?? new Error('Push token registration failed after retries');
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
  cart_reminder: {
    id: 'cart-reminders',
    name: 'Cart Reminders',
    description: 'Reminders about items waiting in your cart',
    importance: 2, // LOW — gentle nudges should not be intrusive
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
