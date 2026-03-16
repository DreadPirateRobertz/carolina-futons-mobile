/**
 * Push notification service — Expo Push API integration.
 *
 * SPIKE RESULT: Expo Push API works for direct send.
 * For production: store tokens in Wix CMS 'PushTokens' collection,
 * trigger sends from Wix backend functions (serverless) on order events.
 * No custom backend server needed.
 *
 * Notification categories for production:
 * - order_update: Order status changes (shipped, delivered)
 * - promo: Sales, new arrivals, seasonal offers
 * - review_request: Post-delivery review prompts
 * - cart_reminder: Abandoned cart recovery (30min, 24h, 72h)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const TOKEN_PATTERN = /^ExponentPushToken\[.+\]$/;

interface DeviceTokenInput {
  userId: string;
  pushToken: string;
  platform: 'ios' | 'android';
}

interface PushMessage {
  pushToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

function validateToken(token: string): void {
  if (!TOKEN_PATTERN.test(token)) {
    throw new Error('Invalid Expo push token format');
  }
}

/**
 * Store a device's push token associated with a user.
 * Spike: stores locally in AsyncStorage. Production: Wix CMS collection.
 */
export async function storeDeviceToken(input: DeviceTokenInput): Promise<{ stored: boolean }> {
  validateToken(input.pushToken);

  // Spike: store locally. Production: Wix CMS 'PushTokens' collection
  await AsyncStorage.setItem(
    `push_token_${input.userId}`,
    JSON.stringify({
      token: input.pushToken,
      platform: input.platform,
      updatedAt: Date.now(),
    }),
  );

  return { stored: true };
}

/**
 * Send a push notification via Expo Push API.
 * Spike: direct HTTP call. Production: triggered from Wix backend functions.
 */
export async function sendTestPush(message: PushMessage): Promise<{ sent: boolean }> {
  validateToken(message.pushToken);

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: message.pushToken,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
    }),
  });

  if (!response.ok) {
    throw new Error(`Push send failed: ${response.status}`);
  }

  return { sent: true };
}
