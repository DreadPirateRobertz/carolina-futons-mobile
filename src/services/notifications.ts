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

/** Format badge count — returns undefined if 0 */
export function formatBadgeCount(count: number): number | undefined {
  return count > 0 ? Math.min(count, 99) : undefined;
}
