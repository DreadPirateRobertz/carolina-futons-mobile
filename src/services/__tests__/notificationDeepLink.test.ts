/**
 * Push notification → deep link → route resolution integration tests.
 *
 * Validates the full flow: a push notification fires, its type + data produce
 * a deep link URL, that URL is parsed, and the resulting route points to the
 * correct screen. Also validates UTM tracking propagation through the chain.
 *
 * Bead: cm--454
 */

import {
  getDeepLinkForNotification,
  shouldShowNotification,
  DEFAULT_PREFERENCES,
  type NotificationType,
  type NotificationPreferences,
} from '../notifications';
import {
  parseDeepLink,
  resolveRoute,
  extractUTM,
  buildShareUrlWithUTM,
  type DeepLinkRoute,
} from '../deepLink';

/**
 * Helper: full pipeline from notification to resolved route.
 * Simulates what happens when a user taps a push notification.
 */
function notificationToRoute(type: NotificationType, data?: Record<string, string>): DeepLinkRoute {
  const url = getDeepLinkForNotification(type, data);
  const parsed = parseDeepLink(url);
  return resolveRoute(parsed);
}

// =============================================================================
// End-to-end: notification tap → screen
// =============================================================================
describe('Push notification → deep link → route (end-to-end)', () => {
  describe('order_update notifications', () => {
    it('routes to OrderDetail when orderId is provided', () => {
      const route = notificationToRoute('order_update', { orderId: 'ord-123' });
      expect(route).toEqual({
        screen: 'OrderDetail',
        params: { orderId: 'ord-123' },
      });
    });

    it('routes to OrderHistory when no orderId', () => {
      const route = notificationToRoute('order_update');
      expect(route).toEqual({ screen: 'OrderHistory' });
    });

    it('routes to OrderHistory when orderId is empty string', () => {
      const route = notificationToRoute('order_update', { orderId: '' });
      // Empty orderId falls through to no-orderId branch
      expect(route).toEqual({ screen: 'OrderHistory' });
    });
  });

  describe('promotion notifications', () => {
    it('routes to ProductDetail when productId is provided', () => {
      const route = notificationToRoute('promotion', { productId: 'asheville-full' });
      expect(route).toEqual({
        screen: 'ProductDetail',
        params: { slug: 'asheville-full' },
      });
    });

    it('routes to Shop when no productId', () => {
      const route = notificationToRoute('promotion');
      expect(route).toEqual({ screen: 'Shop' });
    });

    it('routes to ProductDetail for sale on specific product', () => {
      const route = notificationToRoute('promotion', {
        productId: 'blue-ridge-queen',
        discount: '20',
      });
      expect(route).toEqual({
        screen: 'ProductDetail',
        params: { slug: 'blue-ridge-queen' },
      });
    });
  });

  describe('back_in_stock notifications', () => {
    it('routes to ProductDetail when productId is provided', () => {
      const route = notificationToRoute('back_in_stock', { productId: 'pisgah-twin' });
      expect(route).toEqual({
        screen: 'ProductDetail',
        params: { slug: 'pisgah-twin' },
      });
    });

    it('routes to Wishlist when no productId', () => {
      const route = notificationToRoute('back_in_stock');
      expect(route).toEqual({ screen: 'Wishlist' });
    });
  });

  describe('cart_reminder notifications', () => {
    it('routes to Cart', () => {
      const route = notificationToRoute('cart_reminder');
      expect(route).toEqual({ screen: 'Cart' });
    });

    it('routes to Cart even when extra data is provided', () => {
      const route = notificationToRoute('cart_reminder', { itemCount: '3' });
      expect(route).toEqual({ screen: 'Cart' });
    });
  });
});

// =============================================================================
// UTM tracking through notification deep links
// =============================================================================
describe('UTM tracking in notification deep links', () => {
  it('notification deep links use custom scheme (no UTM by default)', () => {
    const url = getDeepLinkForNotification('order_update', { orderId: 'ord-1' });
    expect(url).toMatch(/^carolinafutons:\/\//);
    const parsed = parseDeepLink(url);
    expect(parsed.utm).toBeNull();
  });

  it('UTM params survive the full parse → extract chain', () => {
    // Simulates a promotion email with UTM tracking
    const base = 'https://carolinafutons.com/product/asheville-full';
    const tracked = buildShareUrlWithUTM(base, {
      source: 'push',
      medium: 'notification',
      campaign: 'spring-sale',
    });
    const parsed = parseDeepLink(tracked);

    expect(parsed.utm).not.toBeNull();
    expect(parsed.utm!.source).toBe('push');
    expect(parsed.utm!.medium).toBe('notification');
    expect(parsed.utm!.campaign).toBe('spring-sale');

    // Route still resolves correctly despite UTM params
    const route = resolveRoute(parsed);
    expect(route).toEqual({
      screen: 'ProductDetail',
      params: { slug: 'asheville-full' },
    });
  });

  it('UTM params with all five fields', () => {
    const url =
      'https://carolinafutons.com/shop?utm_source=push&utm_medium=notification&utm_campaign=clearance&utm_content=hero_banner&utm_term=futon%20sale';
    const parsed = parseDeepLink(url);

    expect(parsed.utm).toEqual({
      source: 'push',
      medium: 'notification',
      campaign: 'clearance',
      content: 'hero_banner',
      term: 'futon sale',
    });
  });

  it('plus signs in query params are not decoded as spaces (known limitation)', () => {
    // NOTE: parseDeepLink uses decodeURIComponent which does not decode '+' as space.
    // Standard query string encoding uses '+' for spaces, but decodeURIComponent only
    // handles %XX encoding. This is a known limitation — use %20 for spaces in UTM params.
    const url = 'https://carolinafutons.com/shop?utm_source=google&utm_term=futon+sale';
    const parsed = parseDeepLink(url);
    expect(parsed.utm!.term).toBe('futon+sale'); // not 'futon sale'
  });

  it('UTM tracking on order update email link', () => {
    const url =
      'https://carolinafutons.com/orders/ord-456?utm_source=email&utm_medium=transactional&utm_campaign=shipping-confirmation';
    const parsed = parseDeepLink(url);
    const route = resolveRoute(parsed);

    expect(route).toEqual({
      screen: 'OrderDetail',
      params: { orderId: 'ord-456' },
    });
    expect(parsed.utm!.source).toBe('email');
    expect(parsed.utm!.campaign).toBe('shipping-confirmation');
  });

  it('UTM tracking on cart reminder SMS link', () => {
    const url =
      'https://carolinafutons.com/cart?utm_source=sms&utm_medium=text&utm_campaign=abandoned-cart';
    const parsed = parseDeepLink(url);
    const route = resolveRoute(parsed);

    expect(route).toEqual({ screen: 'Cart' });
    expect(parsed.utm!.source).toBe('sms');
    expect(parsed.utm!.campaign).toBe('abandoned-cart');
  });

  it('UTM tracking on social media product share', () => {
    const url =
      'https://carolinafutons.com/product/biltmore-loveseat?utm_source=instagram&utm_medium=social&utm_campaign=user-share&utm_content=story';
    const parsed = parseDeepLink(url);
    const route = resolveRoute(parsed);

    expect(route).toEqual({
      screen: 'ProductDetail',
      params: { slug: 'biltmore-loveseat' },
    });
    expect(parsed.utm!.source).toBe('instagram');
    expect(parsed.utm!.medium).toBe('social');
    expect(parsed.utm!.content).toBe('story');
  });
});

// =============================================================================
// Preference filtering + deep link resolution
// =============================================================================
describe('Notification preferences gate deep link generation', () => {
  const allTypes: NotificationType[] = [
    'order_update',
    'promotion',
    'back_in_stock',
    'cart_reminder',
  ];

  it('all enabled notification types produce valid deep link URLs', () => {
    const enabledPrefs: NotificationPreferences = {
      orderUpdates: true,
      promotions: true,
      backInStock: true,
      cartReminders: true,
    };

    for (const type of allTypes) {
      expect(shouldShowNotification(type, enabledPrefs)).toBe(true);
      const url = getDeepLinkForNotification(type);
      expect(url).toMatch(/^carolinafutons:\/\//);
      const parsed = parseDeepLink(url);
      expect(parsed.path).toBeTruthy();
    }
  });

  it('disabled notification types are filtered before deep link generation', () => {
    const disabledPrefs: NotificationPreferences = {
      orderUpdates: false,
      promotions: false,
      backInStock: false,
      cartReminders: false,
    };

    for (const type of allTypes) {
      expect(shouldShowNotification(type, disabledPrefs)).toBe(false);
    }
  });

  it('only cart_reminder is disabled by default', () => {
    const enabledByDefault = allTypes.filter((t) => shouldShowNotification(t, DEFAULT_PREFERENCES));
    const disabledByDefault = allTypes.filter(
      (t) => !shouldShowNotification(t, DEFAULT_PREFERENCES),
    );

    expect(enabledByDefault).toEqual(['order_update', 'promotion', 'back_in_stock']);
    expect(disabledByDefault).toEqual(['cart_reminder']);
  });
});

// =============================================================================
// Edge cases: malformed notification data
// =============================================================================
describe('Edge cases in notification → deep link flow', () => {
  it('handles notification data with extra unknown fields gracefully', () => {
    const route = notificationToRoute('order_update', {
      orderId: 'ord-789',
      unknownField: 'ignored',
      anotherField: '123',
    });
    expect(route).toEqual({
      screen: 'OrderDetail',
      params: { orderId: 'ord-789' },
    });
  });

  it('handles productId with special characters', () => {
    const url = getDeepLinkForNotification('promotion', {
      productId: 'the-asheville-full-size',
    });
    const parsed = parseDeepLink(url);
    const route = resolveRoute(parsed);
    expect(route).toEqual({
      screen: 'ProductDetail',
      params: { slug: 'the-asheville-full-size' },
    });
  });

  it('handles orderId with UUID format', () => {
    const route = notificationToRoute('order_update', {
      orderId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(route).toEqual({
      screen: 'OrderDetail',
      params: { orderId: '550e8400-e29b-41d4-a716-446655440000' },
    });
  });

  it('handles undefined data gracefully for all types', () => {
    expect(() => notificationToRoute('order_update')).not.toThrow();
    expect(() => notificationToRoute('promotion')).not.toThrow();
    expect(() => notificationToRoute('back_in_stock')).not.toThrow();
    expect(() => notificationToRoute('cart_reminder')).not.toThrow();
  });

  it('empty data object treated same as undefined', () => {
    const withEmpty = notificationToRoute('order_update', {});
    const withUndefined = notificationToRoute('order_update');
    expect(withEmpty).toEqual(withUndefined);
  });
});
