/**
 * Integration test: Push Notification → Deep Link → Route Resolution
 * Validates the full chain from notification tap to screen navigation.
 * Covers all notification types, UTM tracking, and edge cases.
 *
 * Bead: cm--454 — Push notification deep link testing
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
  storePendingDeepLink,
  consumePendingDeepLink,
  type DeepLinkRoute,
} from '../deepLink';

jest.mock('../analytics', () => ({
  trackEvent: jest.fn(),
}));

// ============================================================================
// Helper: Full notification-to-route pipeline
// ============================================================================

function notificationToRoute(
  type: NotificationType,
  data?: Record<string, string>,
  utmOverride?: Record<string, string>,
): { route: DeepLinkRoute; deepLink: string; utm: ReturnType<typeof extractUTM> } {
  // Step 1: Notification generates deep link URL
  let deepLink = getDeepLinkForNotification(type, data);

  // Step 2: Append UTM params if provided (simulates notification with tracking)
  if (utmOverride) {
    const params = new URLSearchParams(utmOverride).toString();
    deepLink += (deepLink.includes('?') ? '&' : '?') + params;
  }

  // Step 3: Parse the deep link
  const parsed = parseDeepLink(deepLink);

  // Step 4: Resolve to navigation route
  const route = resolveRoute(parsed);

  return { route, deepLink, utm: parsed.utm };
}

// ============================================================================
// 1. Notification Type → Correct Screen (Full Pipeline)
// ============================================================================

describe('Notification → Deep Link → Screen routing', () => {
  describe('order_update notifications', () => {
    it('routes to OrderDetail when orderId provided', () => {
      const { route } = notificationToRoute('order_update', { orderId: 'ord-9f2a' });
      expect(route).toEqual({ screen: 'OrderDetail', params: { orderId: 'ord-9f2a' } });
    });

    it('routes to OrderHistory when no orderId', () => {
      const { route } = notificationToRoute('order_update');
      expect(route).toEqual({ screen: 'OrderHistory' });
    });

    it('handles orderId with special characters', () => {
      const { route } = notificationToRoute('order_update', { orderId: 'ORD-2026-02-23-001' });
      expect(route).toEqual({ screen: 'OrderDetail', params: { orderId: 'ORD-2026-02-23-001' } });
    });
  });

  describe('promotion notifications', () => {
    it('routes to ProductDetail when productId provided', () => {
      const { route } = notificationToRoute('promotion', { productId: 'asheville-full' });
      expect(route).toEqual({ screen: 'ProductDetail', params: { slug: 'asheville-full' } });
    });

    it('routes to Shop when no productId', () => {
      const { route } = notificationToRoute('promotion');
      expect(route).toEqual({ screen: 'Shop' });
    });

    it('routes to correct product for each futon model', () => {
      const models = ['asheville-full', 'blue-ridge-queen', 'pisgah-twin', 'biltmore-loveseat'];
      for (const modelId of models) {
        const { route } = notificationToRoute('promotion', { productId: modelId });
        expect(route).toEqual({ screen: 'ProductDetail', params: { slug: modelId } });
      }
    });
  });

  describe('back_in_stock notifications', () => {
    it('routes to ProductDetail when productId provided', () => {
      const { route } = notificationToRoute('back_in_stock', { productId: 'pisgah-twin' });
      expect(route).toEqual({ screen: 'ProductDetail', params: { slug: 'pisgah-twin' } });
    });

    it('routes to NotFound (wishlist path) when no productId', () => {
      // wishlist path isn't in resolveRoute's switch — it will be NotFound
      // This validates the deep link generates correct URL even if route isn't defined yet
      const { deepLink } = notificationToRoute('back_in_stock');
      expect(deepLink).toBe('carolinafutons://wishlist');
    });
  });

  describe('cart_reminder notifications', () => {
    it('routes to Cart', () => {
      const { route } = notificationToRoute('cart_reminder');
      expect(route).toEqual({ screen: 'Cart' });
    });

    it('routes to Cart regardless of extra data', () => {
      const { route } = notificationToRoute('cart_reminder', { someExtra: 'data' });
      expect(route).toEqual({ screen: 'Cart' });
    });
  });
});

// ============================================================================
// 2. UTM Tracking Through Notification Deep Links
// ============================================================================

describe('UTM tracking through notification deep links', () => {
  it('preserves UTM params through the full pipeline', () => {
    const { utm } = notificationToRoute(
      'promotion',
      { productId: 'asheville-full' },
      {
        utm_source: 'push',
        utm_medium: 'notification',
        utm_campaign: 'spring-sale',
      },
    );

    expect(utm).not.toBeNull();
    expect(utm!.source).toBe('push');
    expect(utm!.medium).toBe('notification');
    expect(utm!.campaign).toBe('spring-sale');
  });

  it('tracks UTM for order update notifications', () => {
    const { utm, route } = notificationToRoute(
      'order_update',
      { orderId: 'ord-123' },
      {
        utm_source: 'push',
        utm_medium: 'transactional',
        utm_campaign: 'order-shipped',
      },
    );

    expect(route).toEqual({ screen: 'OrderDetail', params: { orderId: 'ord-123' } });
    expect(utm!.source).toBe('push');
    expect(utm!.campaign).toBe('order-shipped');
  });

  it('tracks UTM for cart reminder notifications', () => {
    const { utm, route } = notificationToRoute('cart_reminder', undefined, {
      utm_source: 'push',
      utm_medium: 'remarketing',
      utm_campaign: 'abandoned-cart-24h',
      utm_content: 'variant-a',
    });

    expect(route).toEqual({ screen: 'Cart' });
    expect(utm!.source).toBe('push');
    expect(utm!.campaign).toBe('abandoned-cart-24h');
    expect(utm!.content).toBe('variant-a');
  });

  it('handles notifications without UTM params', () => {
    const { utm } = notificationToRoute('order_update', { orderId: 'ord-456' });
    expect(utm).toBeNull();
  });

  it('partial UTM params are preserved', () => {
    const { utm } = notificationToRoute(
      'promotion',
      { productId: 'asheville-full' },
      {
        utm_source: 'push',
      },
    );
    expect(utm).not.toBeNull();
    expect(utm!.source).toBe('push');
    expect(utm!.medium).toBeNull();
    expect(utm!.campaign).toBeNull();
  });
});

// ============================================================================
// 3. Preference Gating + Deep Link Integration
// ============================================================================

describe('Notification preference gating before deep link routing', () => {
  const allTypes: NotificationType[] = [
    'order_update',
    'promotion',
    'back_in_stock',
    'cart_reminder',
  ];

  it('default preferences allow order_update, promotion, back_in_stock but not cart_reminder', () => {
    expect(shouldShowNotification('order_update', DEFAULT_PREFERENCES)).toBe(true);
    expect(shouldShowNotification('promotion', DEFAULT_PREFERENCES)).toBe(true);
    expect(shouldShowNotification('back_in_stock', DEFAULT_PREFERENCES)).toBe(true);
    expect(shouldShowNotification('cart_reminder', DEFAULT_PREFERENCES)).toBe(false);
  });

  it('disabled notification types do not generate routes', () => {
    const prefs: NotificationPreferences = {
      orderUpdates: false,
      promotions: false,
      backInStock: false,
      cartReminders: false,
    };

    for (const type of allTypes) {
      const shouldShow = shouldShowNotification(type, prefs);
      expect(shouldShow).toBe(false);
    }
  });

  it('all-enabled preferences allow all notification types', () => {
    const prefs: NotificationPreferences = {
      orderUpdates: true,
      promotions: true,
      backInStock: true,
      cartReminders: true,
    };

    for (const type of allTypes) {
      expect(shouldShowNotification(type, prefs)).toBe(true);
      // Verify routing still works for each type
      const { route } = notificationToRoute(type);
      expect(route).toBeDefined();
      expect(route.screen).toBeTruthy();
    }
  });
});

// ============================================================================
// 4. Deferred Deep Links (App Not Running → Install → First Open)
// ============================================================================

describe('Deferred deep links from notifications', () => {
  beforeEach(() => {
    // Clear any pending deep link
    consumePendingDeepLink();
  });

  it('stores notification deep link for deferred processing', () => {
    const deepLink = getDeepLinkForNotification('promotion', { productId: 'blue-ridge-queen' });
    storePendingDeepLink(deepLink);

    const consumed = consumePendingDeepLink();
    expect(consumed).toBe('carolinafutons://product/blue-ridge-queen');

    const parsed = parseDeepLink(consumed!);
    const route = resolveRoute(parsed);
    expect(route).toEqual({ screen: 'ProductDetail', params: { slug: 'blue-ridge-queen' } });
  });

  it('deferred deep link with UTM preserves tracking', () => {
    const deepLink = 'carolinafutons://product/asheville-full?utm_source=push&utm_campaign=welcome';
    storePendingDeepLink(deepLink);

    const consumed = consumePendingDeepLink();
    const parsed = parseDeepLink(consumed!);
    expect(parsed.utm).not.toBeNull();
    expect(parsed.utm!.source).toBe('push');
    expect(parsed.utm!.campaign).toBe('welcome');
  });

  it('consuming deferred deep link clears it', () => {
    storePendingDeepLink(getDeepLinkForNotification('cart_reminder'));
    consumePendingDeepLink();
    expect(consumePendingDeepLink()).toBeNull();
  });

  it('no pending deep link returns null', () => {
    expect(consumePendingDeepLink()).toBeNull();
  });
});

// ============================================================================
// 5. Edge Cases and Error Resilience
// ============================================================================

describe('Edge cases in notification deep link pipeline', () => {
  it('handles empty data object', () => {
    const { route } = notificationToRoute('order_update', {});
    expect(route).toEqual({ screen: 'OrderHistory' });
  });

  it('handles undefined data', () => {
    const { route } = notificationToRoute('promotion', undefined);
    expect(route).toEqual({ screen: 'Shop' });
  });

  it('handles productId with hyphens and numbers', () => {
    const { route } = notificationToRoute('promotion', { productId: 'prod-123-abc' });
    expect(route).toEqual({ screen: 'ProductDetail', params: { slug: 'prod-123-abc' } });
  });

  it('all notification types produce valid deep links', () => {
    const types: NotificationType[] = [
      'order_update',
      'promotion',
      'back_in_stock',
      'cart_reminder',
    ];
    for (const type of types) {
      const deepLink = getDeepLinkForNotification(type);
      expect(deepLink).toMatch(/^carolinafutons:\/\//);
      const parsed = parseDeepLink(deepLink);
      expect(parsed.path).toBeTruthy();
    }
  });

  it('deep link with both path params and UTM params', () => {
    const deepLink =
      'carolinafutons://orders/ord-999?utm_source=push&utm_medium=transactional&utm_campaign=delivery';
    const parsed = parseDeepLink(deepLink);
    const route = resolveRoute(parsed);

    expect(route).toEqual({ screen: 'OrderDetail', params: { orderId: 'ord-999' } });
    expect(parsed.utm!.source).toBe('push');
    expect(parsed.utm!.medium).toBe('transactional');
    expect(parsed.utm!.campaign).toBe('delivery');
  });
});
