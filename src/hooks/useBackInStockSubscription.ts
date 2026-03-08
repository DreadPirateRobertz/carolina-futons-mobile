/**
 * Hook to manage back-in-stock notification subscriptions per product.
 *
 * Stores subscriptions in AsyncStorage keyed by product ID. When a user
 * subscribes, their push token is associated with the product's back-in-stock
 * notification topic. Provides subscribe/unsubscribe and a check for current
 * subscription status.
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@back_in_stock_subscriptions';

interface Subscription {
  productId: string;
  subscribedAt: string;
}

interface UseBackInStockReturn {
  /** Whether the current product is subscribed for back-in-stock alerts */
  isSubscribed: boolean;
  /** Whether the subscription state is still loading */
  loading: boolean;
  /** Subscribe to back-in-stock notifications for this product */
  subscribe: () => Promise<void>;
  /** Unsubscribe from back-in-stock notifications for this product */
  unsubscribe: () => Promise<void>;
  /** Toggle subscription state */
  toggle: () => Promise<void>;
}

async function getSubscriptions(): Promise<Subscription[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveSubscriptions(subs: Subscription[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
}

export function useBackInStockSubscription(productId: string): UseBackInStockReturn {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const subs = await getSubscriptions();
      if (!cancelled) {
        setIsSubscribed(subs.some((s) => s.productId === productId));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [productId]);

  const subscribe = useCallback(async () => {
    const subs = await getSubscriptions();
    if (!subs.some((s) => s.productId === productId)) {
      subs.push({ productId, subscribedAt: new Date().toISOString() });
      await saveSubscriptions(subs);
    }
    setIsSubscribed(true);
  }, [productId]);

  const unsubscribe = useCallback(async () => {
    const subs = await getSubscriptions();
    const filtered = subs.filter((s) => s.productId !== productId);
    await saveSubscriptions(filtered);
    setIsSubscribed(false);
  }, [productId]);

  const toggle = useCallback(async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  return { isSubscribed, loading, subscribe, unsubscribe, toggle };
}
