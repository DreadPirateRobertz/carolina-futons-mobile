import {
  getDeepLinkForNotification,
  shouldShowNotification,
  formatBadgeCount,
  DEFAULT_PREFERENCES,
  NOTIFICATION_TYPE_CONFIG,
  type NotificationPreferences,
  type NotificationType,
} from '../notifications';

describe('Notification service', () => {
  describe('getDeepLinkForNotification', () => {
    it('returns order detail link for order_update with orderId', () => {
      expect(
        getDeepLinkForNotification('order_update', { orderId: 'ord-001' }),
      ).toBe('carolinafutons://orders/ord-001');
    });

    it('returns orders list link for order_update without orderId', () => {
      expect(getDeepLinkForNotification('order_update')).toBe(
        'carolinafutons://orders',
      );
    });

    it('returns product link for promotion with productId', () => {
      expect(
        getDeepLinkForNotification('promotion', { productId: 'asheville-full' }),
      ).toBe('carolinafutons://product/asheville-full');
    });

    it('returns shop link for promotion without productId', () => {
      expect(getDeepLinkForNotification('promotion')).toBe(
        'carolinafutons://shop',
      );
    });

    it('returns product link for back_in_stock with productId', () => {
      expect(
        getDeepLinkForNotification('back_in_stock', { productId: 'pisgah-twin' }),
      ).toBe('carolinafutons://product/pisgah-twin');
    });

    it('returns wishlist link for back_in_stock without productId', () => {
      expect(getDeepLinkForNotification('back_in_stock')).toBe(
        'carolinafutons://wishlist',
      );
    });

    it('returns cart link for cart_reminder', () => {
      expect(getDeepLinkForNotification('cart_reminder')).toBe(
        'carolinafutons://cart',
      );
    });
  });

  describe('shouldShowNotification', () => {
    it('respects orderUpdates preference', () => {
      expect(shouldShowNotification('order_update', DEFAULT_PREFERENCES)).toBe(true);
      expect(
        shouldShowNotification('order_update', { ...DEFAULT_PREFERENCES, orderUpdates: false }),
      ).toBe(false);
    });

    it('respects promotions preference', () => {
      expect(shouldShowNotification('promotion', DEFAULT_PREFERENCES)).toBe(true);
      expect(
        shouldShowNotification('promotion', { ...DEFAULT_PREFERENCES, promotions: false }),
      ).toBe(false);
    });

    it('respects backInStock preference', () => {
      expect(shouldShowNotification('back_in_stock', DEFAULT_PREFERENCES)).toBe(true);
    });

    it('respects cartReminders preference (default off)', () => {
      expect(shouldShowNotification('cart_reminder', DEFAULT_PREFERENCES)).toBe(false);
      expect(
        shouldShowNotification('cart_reminder', { ...DEFAULT_PREFERENCES, cartReminders: true }),
      ).toBe(true);
    });
  });

  describe('formatBadgeCount', () => {
    it('returns undefined for 0', () => {
      expect(formatBadgeCount(0)).toBeUndefined();
    });

    it('returns the count for small numbers', () => {
      expect(formatBadgeCount(3)).toBe(3);
    });

    it('caps at 99', () => {
      expect(formatBadgeCount(150)).toBe(99);
    });
  });

  describe('DEFAULT_PREFERENCES', () => {
    it('has expected defaults', () => {
      expect(DEFAULT_PREFERENCES.orderUpdates).toBe(true);
      expect(DEFAULT_PREFERENCES.promotions).toBe(true);
      expect(DEFAULT_PREFERENCES.backInStock).toBe(true);
      expect(DEFAULT_PREFERENCES.cartReminders).toBe(false);
    });
  });

  describe('NOTIFICATION_TYPE_CONFIG', () => {
    const allTypes: NotificationType[] = [
      'order_update',
      'promotion',
      'back_in_stock',
      'cart_reminder',
    ];

    it('has config for all notification types', () => {
      for (const t of allTypes) {
        expect(NOTIFICATION_TYPE_CONFIG[t].label).toBeTruthy();
        expect(NOTIFICATION_TYPE_CONFIG[t].description).toBeTruthy();
        expect(NOTIFICATION_TYPE_CONFIG[t].prefKey).toBeTruthy();
      }
    });
  });
});
