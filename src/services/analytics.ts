/**
 * @module analytics
 *
 * Analytics service for event tracking, screen views, and user identification.
 *
 * This is the central analytics abstraction layer for the Carolina Futons mobile
 * app. It exists to decouple feature code from specific analytics vendors, so
 * the underlying provider (Amplitude, Mixpanel, Firebase Analytics, etc.) can be
 * swapped or combined without changing call sites throughout the app.
 *
 * In development, events are logged to the console and buffered in memory for
 * inspection. In production, a registered {@link AnalyticsProvider} receives all
 * calls. Multiple providers can be combined via the {@link MultiProvider} adapter
 * in `providers/multiProvider.ts`.
 *
 * @example
 *   analytics.trackEvent('add_to_cart', { productId: 'abc', price: 349 });
 *   analytics.trackScreenView('ProductDetail', { productId: 'abc' });
 *   analytics.identify('user-123', { email: 'user@example.com' });
 */

/**
 * Union of all recognized analytics event names.
 *
 * Augmented Reality (AR) events are prefixed with `ar_`. Keeping a closed union
 * prevents typos and enables exhaustive type-checking in funnel definitions.
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
  | 'ar_view_in_room_tap'
  | 'ar_model_selected'
  | 'ar_add_to_cart'
  | 'app_open'
  | 'app_background'
  | 'deep_link_opened'
  | 'notification_received'
  | 'notification_opened'
  | 'ar_screenshot'
  | 'ar_share'
  | 'ar_save_to_gallery'
  | 'ar_save_to_wishlist'
  | 'ar_add_to_cart'
  | 'submit_review'
  | 'helpful_vote'
  | 'ar_surface_detected'
  | 'ar_surface_tracking'
  | 'ar_furniture_placed'
  | 'ar_lighting_warning'
  | 'ar_product_picker_open'
  | 'heatmap_tap'
  | 'scroll_depth'
  | 'error';

/** A single buffered analytics event with its metadata. */
export interface AnalyticsEvent {
  /** The event name from the {@link AnalyticsEventName} union. */
  name: AnalyticsEventName;
  /** Arbitrary key-value properties attached to the event. */
  properties?: Record<string, string | number | boolean>;
  /** Unix epoch timestamp (milliseconds) when the event was recorded. */
  timestamp: number;
}

/** User-level properties for analytics attribution and segmentation. */
export interface UserProperties {
  email?: string;
  name?: string;
  /** ISO 8601 (International Organization for Standardization) date string. */
  memberSince?: string;
  totalOrders?: number;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Contract that all analytics vendor adapters must implement.
 *
 * Each method mirrors a common analytics operation. Implementations live in
 * `providers/` (e.g., {@link FirebaseAnalyticsProvider}, {@link MixpanelAnalyticsProvider}).
 */
export interface AnalyticsProvider {
  /**
   * Track a named event with optional properties.
   * @param name - The event name.
   * @param properties - Optional key-value metadata for the event.
   */
  trackEvent(
    name: AnalyticsEventName,
    properties?: Record<string, string | number | boolean>,
  ): void;
  /**
   * Track a screen view.
   * @param screenName - The screen or page name.
   * @param properties - Optional additional properties.
   */
  trackScreenView(screenName: string, properties?: Record<string, string | number | boolean>): void;
  /**
   * Associate subsequent events with a known user.
   * @param userId - Unique user identifier.
   * @param properties - Optional user-level properties.
   */
  identify(userId: string, properties?: UserProperties): void;
  /** Reset analytics state — typically called on logout. */
  reset(): void;
  /**
   * Enable or disable event collection (for privacy / opt-out flows).
   * @param enabled - Whether collection should be active.
   */
  setEnabled(enabled: boolean): void;
}

/**
 * In-memory ring buffer of recent events for development inspection and testing.
 * Capped at {@link MAX_BUFFER_SIZE} to prevent unbounded memory growth.
 */
const eventBuffer: AnalyticsEvent[] = [];
const MAX_BUFFER_SIZE = 500;

let _enabled = true;
let _userId: string | null = null;
let _userProperties: UserProperties = {};
let _provider: AnalyticsProvider | null = null;

/**
 * Register a concrete analytics provider to receive all future tracking calls.
 *
 * Call once at app startup (via `analyticsInit.ts`). Subsequent calls replace
 * the previously registered provider.
 *
 * @param provider - The {@link AnalyticsProvider} implementation to delegate to.
 */
export function registerProvider(provider: AnalyticsProvider): void {
  _provider = provider;
}

/**
 * Track a named event with optional properties.
 *
 * Events are always buffered in memory (for dev/test access). If a provider
 * is registered, the event is also forwarded there. In `__DEV__` mode without
 * a provider, events are logged to the console.
 *
 * @param name - The event name from the {@link AnalyticsEventName} union.
 * @param properties - Optional key-value metadata for the event.
 */
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

/**
 * Track a screen view. Internally emits a `screen_view` event.
 *
 * @param screenName - The name of the screen being viewed (e.g., 'ProductDetail').
 * @param properties - Optional additional properties merged with the screen name.
 */
export function trackScreenView(
  screenName: string,
  properties?: Record<string, string | number | boolean>,
): void {
  trackEvent('screen_view', { screen_name: screenName, ...properties });
}

/**
 * Identify a user for analytics attribution.
 *
 * Merges provided properties with any previously set properties. Call after
 * login to associate anonymous events with a known user.
 *
 * @param userId - Unique user identifier (e.g., Wix member ID).
 * @param properties - Optional user-level properties for segmentation.
 */
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

/**
 * Reset analytics state. Call on user logout to clear identification
 * and buffered events, preventing data leakage between sessions.
 */
export function reset(): void {
  _userId = null;
  _userProperties = {};
  eventBuffer.length = 0;

  if (_provider) {
    _provider.reset();
  }
}

/**
 * Enable or disable analytics collection globally.
 *
 * Used for privacy opt-out flows. When disabled, {@link trackEvent} becomes
 * a no-op and the provider is also informed.
 *
 * @param enabled - `true` to collect events, `false` to suppress.
 */
export function setEnabled(enabled: boolean): void {
  _enabled = enabled;
  if (_provider) {
    _provider.setEnabled(enabled);
  }
}

/**
 * Get the currently identified user ID, or `null` if no user is set.
 *
 * @returns The user ID string or `null`.
 */
export function getUserId(): string | null {
  return _userId;
}

/**
 * Check whether analytics collection is currently enabled.
 *
 * @returns `true` if event collection is active.
 */
export function isEnabled(): boolean {
  return _enabled;
}

/**
 * Get the in-memory event buffer. Useful for testing and debugging.
 *
 * @returns A read-only view of buffered {@link AnalyticsEvent} entries.
 */
export function getEventBuffer(): readonly AnalyticsEvent[] {
  return eventBuffer;
}

/** Clear the in-memory event buffer. Typically used in test teardown. */
export function clearEventBuffer(): void {
  eventBuffer.length = 0;
}

/**
 * Filter the event buffer by event name.
 *
 * @param name - The {@link AnalyticsEventName} to filter on.
 * @returns Array of matching events, ordered oldest to newest.
 */
export function getEventsByName(name: AnalyticsEventName): AnalyticsEvent[] {
  return eventBuffer.filter((e) => e.name === name);
}

/**
 * Pre-defined convenience helpers for common analytics events.
 *
 * Each method wraps {@link trackEvent} with strongly typed parameters, so
 * call sites don't need to construct property objects manually. This reduces
 * typos and ensures consistent property naming across the app.
 */
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
  arScreenshot(modelId: string, fabricId: string) {
    trackEvent('ar_screenshot', { model_id: modelId, fabric_id: fabricId });
  },
  arShare(modelId: string, fabricId: string) {
    trackEvent('ar_share', { model_id: modelId, fabric_id: fabricId });
  },
  arSaveToGallery(modelId: string, fabricId: string) {
    trackEvent('ar_save_to_gallery', { model_id: modelId, fabric_id: fabricId });
  },
  arSaveToWishlist(modelId: string, fabricId: string) {
    trackEvent('ar_save_to_wishlist', { model_id: modelId, fabric_id: fabricId });
  },
  arViewInRoomTap(productId: string, category: string) {
    trackEvent('ar_view_in_room_tap', { product_id: productId, category });
  },
  arModelSelected(modelId: string, productId: string) {
    trackEvent('ar_model_selected', { model_id: modelId, product_id: productId });
  },
  arAddToCart(modelId: string, fabricId: string, price: number) {
    trackEvent('ar_add_to_cart', { model_id: modelId, fabric_id: fabricId, price });
  },
  submitReview(productId: string, rating: number) {
    trackEvent('submit_review', { product_id: productId, rating });
  },
  helpfulVote(reviewId: string, productId: string) {
    trackEvent('helpful_vote', { review_id: reviewId, product_id: productId });
  },
  beginCheckout(itemCount: number, total: number) {
    trackEvent('begin_checkout', { item_count: itemCount, total });
  },
  arSurfaceDetected(planeType: string, confidence: number) {
    trackEvent('ar_surface_detected', { plane_type: planeType, confidence });
  },
  arSurfaceTracking(planeCount: number) {
    trackEvent('ar_surface_tracking', { plane_count: planeCount });
  },
  arFurniturePlaced(modelId: string, planeId: string) {
    trackEvent('ar_furniture_placed', { model_id: modelId, plane_id: planeId });
  },
  arLightingWarning(condition: string) {
    trackEvent('ar_lighting_warning', { condition });
  },
  arProductPickerOpen(currentModelId: string) {
    trackEvent('ar_product_picker_open', { current_model_id: currentModelId });
  },
} as const;
