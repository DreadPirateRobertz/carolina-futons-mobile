/**
 * @module orderCache
 *
 * Persists order history to AsyncStorage so users can view past orders
 * while offline. Cached data includes a timestamp for staleness checks.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Order } from '@/data/orders';

/** AsyncStorage key for the cached order history blob. */
export const ORDER_CACHE_KEY = 'cfutons_order_history';

interface CachedOrderData {
  orders: Order[];
  cachedAt: string;
}

export async function cacheOrders(orders: Order[]): Promise<void> {
  try {
    const data: CachedOrderData = {
      orders,
      cachedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(ORDER_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Storage write failed — silent
  }
}

export async function loadCachedOrders(): Promise<CachedOrderData | null> {
  try {
    const stored = await AsyncStorage.getItem(ORDER_CACHE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed.orders || !Array.isArray(parsed.orders)) return null;
    return parsed as CachedOrderData;
  } catch {
    return null;
  }
}

export async function clearOrderCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ORDER_CACHE_KEY);
  } catch {
    // Removal failed — silent
  }
}
