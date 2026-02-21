/**
 * Analytics service for event tracking, screen views, and user identification.
 *
 * Abstraction layer that logs in development and can be swapped for a real
 * analytics provider (Amplitude, Mixpanel, Firebase Analytics) in production.
 *
 * Usage:
 *   analytics.trackEvent('add_to_cart', { productId: 'abc', price: 349 });
 *   analytics.trackScreenView('ProductDetail', { productId: 'abc' });
 *   analytics.identify('user-123', { email: 'user@example.com' });
 */

export type AnalyticsEventName =
  | 'screen_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'add_to_wishlist'
  | 'remove_from_wishlist'
  | 'share_wishlist'
  | 'begin_checkout'
  | 'purchase'
  | 'search'
  | 'filter_category'
  | 'sort_products'
  | 'open_ar'
  | 'select_fabric'
  | 'view_product'
  | 'app_open'
  | 'app_background'
  | 'deep_link_opened'
  | 'notification_received'
  | 'notification_opened'
  | 'error';

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  properties?: Record<string, string | number | boolean>;
  timestamp: number;
}

export interface UserProperties {
  email?: string;
  name?: string;
  memberSince?: string;
  totalOrders?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface AnalyticsProvider {
  trackEvent(name: AnalyticsEventName, properties?: Record<string, string | number | boolean>): void;
  trackScreenView(screenName: string, properties?: Record<string, string | number | boolean>): void;
  identify(userId: string, properties?: UserProperties): void;
  reset(): void;
  setEnabled(enabled: boolean): void;
}

/** In-memory event buffer for dev/testing */
const eventBuffer: AnalyticsEvent[] = [];
const MAX_BUFFER_SIZE = 500;

let _enabled = true;
let _userId: string | null = null;
let _userProperties: UserProperties = {};
let _provider: AnalyticsProvider | null = null;

/** Register a real analytics provider (e.g., Amplitude, Firebase) */
export function registerProvider(provider: AnalyticsProvider): void {
  _provider = provider;
}

/** Track a named event with optional properties */
export function trackEvent(
  name: AnalyticsEventName,
  properties?: Record<string, string | number | boolean>,
): void {
  if (!_enabled) return;

  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: Date.now(),
  };

  // Buffer for dev/testing
  eventBuffer.push(event);
  if (eventBuffer.length > MAX_BUFFER_SIZE) {
    eventBuffer.shift();
  }

  // Delegate to real provider if registered
  if (_provider) {
    _provider.trackEvent(name, properties);
  } else if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[Analytics] ${name}`, properties ?? '');
  }
}

/** Track a screen view */
export function trackScreenView(
  screenName: string,
  properties?: Record<string, string | number | boolean>,
): void {
  trackEvent('screen_view', { screen_name: screenName, ...properties });
}

/** Identify a user for analytics attribution */
export function identify(userId: string, properties?: UserProperties): void {
  _userId = userId;
  _userProperties = { ..._userProperties, ...properties };

  if (_provider) {
    _provider.identify(userId, _userProperties);
  } else if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[Analytics] identify: ${userId}`, _userProperties);
  }
}

/** Reset analytics state (on logout) */
export function reset(): void {
  _userId = null;
  _userProperties = {};
  eventBuffer.length = 0;

  if (_provider) {
    _provider.reset();
  }
}

/** Enable or disable analytics collection */
export function setEnabled(enabled: boolean): void {
  _enabled = enabled;
  if (_provider) {
    _provider.setEnabled(enabled);
  }
}

/** Get current user ID */
export function getUserId(): string | null {
  return _userId;
}

/** Get whether analytics is enabled */
export function isEnabled(): boolean {
  return _enabled;
}

/** Get buffered events (for testing/debugging) */
export function getEventBuffer(): readonly AnalyticsEvent[] {
  return eventBuffer;
}

/** Clear the event buffer */
export function clearEventBuffer(): void {
  eventBuffer.length = 0;
}

/** Get events by name from the buffer */
export function getEventsByName(name: AnalyticsEventName): AnalyticsEvent[] {
  return eventBuffer.filter((e) => e.name === name);
}

/** Convenience: pre-defined event helpers */
export const events = {
  addToCart(productId: string, price: number, quantity: number) {
    trackEvent('add_to_cart', { product_id: productId, price, quantity });
  },
  removeFromCart(productId: string) {
    trackEvent('remove_from_cart', { product_id: productId });
  },
  addToWishlist(productId: string, price: number) {
    trackEvent('add_to_wishlist', { product_id: productId, price });
  },
  removeFromWishlist(productId: string) {
    trackEvent('remove_from_wishlist', { product_id: productId });
  },
  shareWishlist(itemCount: number) {
    trackEvent('share_wishlist', { item_count: itemCount });
  },
  search(query: string, resultCount: number) {
    trackEvent('search', { query, result_count: resultCount });
  },
  filterCategory(category: string) {
    trackEvent('filter_category', { category });
  },
  sortProducts(sortBy: string) {
    trackEvent('sort_products', { sort_by: sortBy });
  },
  viewProduct(productId: string, source: string) {
    trackEvent('view_product', { product_id: productId, source });
  },
  openAR(productId: string) {
    trackEvent('open_ar', { product_id: productId });
  },
  selectFabric(productId: string, fabricId: string) {
    trackEvent('select_fabric', { product_id: productId, fabric_id: fabricId });
  },
  purchase(orderId: string, total: number, itemCount: number) {
    trackEvent('purchase', { order_id: orderId, total, item_count: itemCount });
  },
  deepLinkOpened(url: string, screen: string) {
    trackEvent('deep_link_opened', { url, screen });
  },
} as const;
