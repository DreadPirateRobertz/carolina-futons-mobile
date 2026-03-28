/**
 * useCartAbandonmentRecovery — 1hr cart abandonment recovery push.
 *
 * Schedules a rich push notification after 1hr of cart inactivity.
 * Sets a dedup flag on the Wix member record to suppress the web
 * email recovery (cf-ji7j). Clears dedup flag on order completion.
 *
 * Payload: cart_items[0..2] (name, image_url, price), total_price, cart_id.
 * Deep link: carolinafutons://cart
 *
 * Bead: hq-8k690
 */
import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOptionalWixClient } from '@/services/wix';
import type { CartItem } from '@/hooks/useCart';

// ── Constants ────────────────────────────────────────────────────────────────

/** 1 hour in milliseconds */
export const RECOVERY_TRIGGER_MS = 60 * 60 * 1000;

const STORAGE_KEY = '@cart_recovery_state';

// ── Types ────────────────────────────────────────────────────────────────────

interface RecoveryPayloadItem {
  name: string;
  image_url: string | null;
  price: number;
}

interface RecoveryPayload {
  cart_items: RecoveryPayloadItem[];
  total_price: number;
  cart_id: string;
}

interface RecoveryState {
  scheduledNotificationId: string | null;
}

interface Options {
  items: CartItem[];
  subtotal: number;
  cartId: string;
  userId: string | null;
  pushPermitted: boolean;
}

// ── Payload builder ──────────────────────────────────────────────────────────

export function buildRecoveryPayload(
  items: CartItem[],
  totalPrice: number,
  cartId: string,
): RecoveryPayload {
  return {
    cart_items: items.slice(0, 3).map((item) => ({
      name: item.model.name,
      image_url: item.imageUrl ?? null,
      price: item.unitPrice,
    })),
    total_price: totalPrice,
    cart_id: cartId,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCartAbandonmentRecovery(options: Options) {
  const { items, subtotal, cartId, userId, pushPermitted } = options;
  const wixClient = useOptionalWixClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduledIdRef = useRef<string | null>(null);

  // Snapshot refs so the timer callback sees current values
  const itemsRef = useRef(items);
  const subtotalRef = useRef(subtotal);
  const cartIdRef = useRef(cartId);
  const userIdRef = useRef(userId);
  const pushPermittedRef = useRef(pushPermitted);
  const wixClientRef = useRef(wixClient);

  useEffect(() => {
    itemsRef.current = items;
    subtotalRef.current = subtotal;
    cartIdRef.current = cartId;
    userIdRef.current = userId;
    pushPermittedRef.current = pushPermitted;
    wixClientRef.current = wixClient;
  }, [items, subtotal, cartId, userId, pushPermitted, wixClient]);

  // Load persisted state on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const state: RecoveryState = JSON.parse(raw);
        scheduledIdRef.current = state.scheduledNotificationId;
      } catch {
        // Corrupt state — ignore
      }
    });
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleRecoveryPush = useCallback(async () => {
    const currentItems = itemsRef.current;
    const currentUserId = userIdRef.current;
    const currentPushPermitted = pushPermittedRef.current;
    const client = wixClientRef.current;

    // Guard: don't send if conditions aren't met
    if (currentItems.length === 0 || !currentUserId || !currentPushPermitted) {
      return;
    }

    const payload = buildRecoveryPayload(
      currentItems,
      subtotalRef.current,
      cartIdRef.current,
    );

    const itemCount = currentItems.length;
    const itemWord = itemCount === 1 ? 'item' : 'items';

    try {
      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Don't forget your cart!`,
          body: `You have ${itemCount} ${itemWord} waiting — complete your order before they sell out!`,
          data: {
            type: 'cart_recovery',
            deepLink: 'carolinafutons://cart',
            ...payload,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5, // Immediate-ish — the 1hr delay is handled by the JS timer
          repeats: false,
        },
      });

      scheduledIdRef.current = notifId;
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ scheduledNotificationId: notifId }),
      );

      // Set dedup flag to suppress web email
      if (client?.setMemberField) {
        await client.setMemberField(currentUserId, 'cartRecoveryPushSent', true);
      }
    } catch {
      // Non-critical — don't crash the app for a notification failure
    }
  }, []);

  const onCartActivity = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(scheduleRecoveryPush, RECOVERY_TRIGGER_MS);
  }, [clearTimer, scheduleRecoveryPush]);

  const onOrderPlaced = useCallback(async () => {
    clearTimer();

    // Cancel any scheduled notification
    if (scheduledIdRef.current) {
      try {
        await Notifications.cancelScheduledNotificationAsync(scheduledIdRef.current);
      } catch {
        // Already delivered or expired — safe to ignore
      }
      scheduledIdRef.current = null;
    }

    await AsyncStorage.removeItem(STORAGE_KEY);

    // Clear dedup flag so web email can fire for future carts
    const currentUserId = userIdRef.current;
    const client = wixClientRef.current;
    if (client?.setMemberField && currentUserId) {
      try {
        await client.setMemberField(currentUserId, 'cartRecoveryPushSent', false);
      } catch {
        // Non-critical
      }
    }
  }, [clearTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return { onCartActivity, onOrderPlaced };
}
