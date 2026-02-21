/**
 * Analytics and crash reporting service.
 *
 * Abstraction layer over analytics SDK. For production:
 * - expo-analytics or expo-firebase-analytics for event tracking
 * - Sentry (@sentry/react-native) for crash reporting + breadcrumbs
 * - This module provides a provider-agnostic API so the underlying
 *   SDK can be swapped without touching screen/component code.
 */

// --- Event types ---

export type AnalyticsEventName =
  | 'screen_view'
  | 'product_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'search'
  | 'share'
  | 'sign_up'
  | 'login'
  | 'add_to_wishlist'
  | 'select_category'
  | 'app_open'
  | 'deep_link_opened'
  | 'notification_opened'
  | 'ar_session_start'
  | 'ar_session_end';

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  params?: Record<string, string | number | boolean>;
  timestamp?: string;
}

export interface UserProperties {
  userId?: string;
  email?: string;
  isGuest: boolean;
}

export interface ScreenViewEvent {
  screenName: string;
  screenClass?: string;
}

export interface EcommerceItem {
  itemId: string;
  itemName: string;
  category?: string;
  price: number;
  quantity: number;
}

// --- Crash reporting types ---

export type CrashSeverity = 'fatal' | 'error' | 'warning' | 'info';

export interface CrashContext {
  screen?: string;
  action?: string;
  extra?: Record<string, string>;
}

export interface Breadcrumb {
  category: string;
  message: string;
  level: CrashSeverity;
  timestamp: string;
}

// --- In-memory event log (mock backend) ---

const eventLog: AnalyticsEvent[] = [];
const breadcrumbs: Breadcrumb[] = [];
let currentUser: UserProperties = { isGuest: true };
let initialized = false;

const MAX_BREADCRUMBS = 50;

// --- Analytics API ---

/** Initialize analytics SDK. Call once at app startup. */
export function initAnalytics(): void {
  initialized = true;
  trackEvent('app_open');
}

/** Check if analytics has been initialized. */
export function isInitialized(): boolean {
  return initialized;
}

/** Track a named event with optional params. */
export function trackEvent(
  name: AnalyticsEventName,
  params?: Record<string, string | number | boolean>,
): void {
  const event: AnalyticsEvent = {
    name,
    params,
    timestamp: new Date().toISOString(),
  };
  eventLog.push(event);
  addBreadcrumb('analytics', `Event: ${name}`, 'info');
}

/** Track a screen view. */
export function trackScreenView(screen: ScreenViewEvent): void {
  trackEvent('screen_view', {
    screen_name: screen.screenName,
    ...(screen.screenClass && { screen_class: screen.screenClass }),
  });
}

/** Track e-commerce add-to-cart. */
export function trackAddToCart(item: EcommerceItem): void {
  trackEvent('add_to_cart', {
    item_id: item.itemId,
    item_name: item.itemName,
    price: item.price,
    quantity: item.quantity,
    ...(item.category && { category: item.category }),
  });
}

/** Track e-commerce purchase. */
export function trackPurchase(
  orderId: string,
  total: number,
  items: EcommerceItem[],
): void {
  trackEvent('purchase', {
    order_id: orderId,
    value: total,
    item_count: items.length,
  });
}

/** Set user properties for attribution. */
export function setUserProperties(props: UserProperties): void {
  currentUser = { ...props };
  addBreadcrumb(
    'user',
    props.isGuest ? 'Guest user' : `User: ${props.userId}`,
    'info',
  );
}

/** Get current user properties. */
export function getUserProperties(): UserProperties {
  return { ...currentUser };
}

// --- Crash reporting API ---

/** Report an error to crash reporting. */
export function reportCrash(
  error: Error,
  severity: CrashSeverity = 'error',
  context?: CrashContext,
): void {
  addBreadcrumb('crash', `${severity}: ${error.message}`, severity);
  // In production: Sentry.captureException(error, { level: severity, extra: context })
  eventLog.push({
    name: 'screen_view', // placeholder — real SDK uses separate crash channel
    params: {
      _crash: true,
      error_message: error.message,
      severity,
      ...(context?.screen && { screen: context.screen }),
      ...(context?.action && { action: context.action }),
    },
    timestamp: new Date().toISOString(),
  });
}

/** Add a breadcrumb for crash context trail. */
export function addBreadcrumb(
  category: string,
  message: string,
  level: CrashSeverity = 'info',
): void {
  breadcrumbs.push({
    category,
    message,
    level,
    timestamp: new Date().toISOString(),
  });
  // Keep bounded
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.splice(0, breadcrumbs.length - MAX_BREADCRUMBS);
  }
}

/** Get breadcrumb trail (for debugging / test assertions). */
export function getBreadcrumbs(): Breadcrumb[] {
  return [...breadcrumbs];
}

// --- Test helpers ---

/** Get all logged events (for test assertions). */
export function getEventLog(): AnalyticsEvent[] {
  return [...eventLog];
}

/** Reset all analytics state. Use in tests only. */
export function resetAnalytics(): void {
  eventLog.length = 0;
  breadcrumbs.length = 0;
  currentUser = { isGuest: true };
  initialized = false;
}
