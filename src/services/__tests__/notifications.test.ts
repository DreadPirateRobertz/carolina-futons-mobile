import {
  getDeepLinkForNotification,
  getDeepLinkFromPayload,
  shouldShowNotification,
  formatBadgeCount,
  getChannelId,
  registerPushToken,
  DEFAULT_PREFERENCES,
  NOTIFICATION_TYPE_CONFIG,
  ANDROID_CHANNEL_CONFIG,
  type NotificationType,
} from '../notifications';

describe('Notification service', () => {
  describe('getDeepLinkForNotification', () => {
    it('returns order detail link for order_update with orderId', () => {
      expect(getDeepLinkForNotification('order_update', { orderId: 'ord-001' })).toBe(
        'carolinafutons://orders/ord-001',
      );
    });

    it('returns orders list link for order_update without orderId', () => {
      expect(getDeepLinkForNotification('order_update')).toBe('carolinafutons://orders');
    });

    it('returns product link for promotion with productId', () => {
      expect(getDeepLinkForNotification('promotion', { productId: 'asheville-full' })).toBe(
        'carolinafutons://product/asheville-full',
      );
    });

    it('returns shop link for promotion without productId', () => {
      expect(getDeepLinkForNotification('promotion')).toBe('carolinafutons://shop');
    });

    it('returns product link for back_in_stock with productId', () => {
      expect(getDeepLinkForNotification('back_in_stock', { productId: 'pisgah-twin' })).toBe(
        'carolinafutons://product/pisgah-twin',
      );
    });

    it('returns wishlist link for back_in_stock without productId', () => {
      expect(getDeepLinkForNotification('back_in_stock')).toBe('carolinafutons://wishlist');
    });

    it('returns cart link for cart_reminder', () => {
      expect(getDeepLinkForNotification('cart_reminder')).toBe('carolinafutons://cart');
    });

    it('returns cart link for cart_recovery', () => {
      expect(getDeepLinkForNotification('cart_recovery')).toBe('carolinafutons://cart');
    });

    it('prefers snake_case payload keys over type-based routing', () => {
      expect(getDeepLinkForNotification('promotion', { product_id: 'asheville-full' })).toBe(
        'carolinafutons://product/asheville-full',
      );
    });

    it('routes order_id payload to OrderDetail', () => {
      expect(getDeepLinkForNotification('order_update', { order_id: 'ord-999' })).toBe(
        'carolinafutons://orders/ord-999',
      );
    });

    it('routes collection_slug payload to CollectionDetail', () => {
      expect(getDeepLinkForNotification('promotion', { collection_slug: 'summer-sale' })).toBe(
        'carolinafutons://collections/summer-sale',
      );
    });

    it('routes promo payload to Home with promo param', () => {
      expect(getDeepLinkForNotification('promotion', { promo: 'spring20' })).toBe(
        'carolinafutons://home?promo=spring20',
      );
    });
  });

  describe('getDeepLinkFromPayload', () => {
    it('returns null for undefined data', () => {
      expect(getDeepLinkFromPayload()).toBeNull();
    });

    it('returns null for empty data', () => {
      expect(getDeepLinkFromPayload({})).toBeNull();
    });

    it('returns null for unrecognized keys', () => {
      expect(getDeepLinkFromPayload({ foo: 'bar' })).toBeNull();
    });

    it('maps product_id to product deep link', () => {
      expect(getDeepLinkFromPayload({ product_id: 'pisgah-twin' })).toBe(
        'carolinafutons://product/pisgah-twin',
      );
    });

    it('maps order_id to orders deep link', () => {
      expect(getDeepLinkFromPayload({ order_id: 'ord-456' })).toBe(
        'carolinafutons://orders/ord-456',
      );
    });

    it('maps collection_slug to collections deep link', () => {
      expect(getDeepLinkFromPayload({ collection_slug: 'bedroom-sets' })).toBe(
        'carolinafutons://collections/bedroom-sets',
      );
    });

    it('maps promo to home with promo query param', () => {
      expect(getDeepLinkFromPayload({ promo: 'welcome10' })).toBe(
        'carolinafutons://home?promo=welcome10',
      );
    });

    it('prioritizes product_id over other keys', () => {
      expect(getDeepLinkFromPayload({ product_id: 'x', order_id: 'y', promo: 'z' })).toBe(
        'carolinafutons://product/x',
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

    it('respects cartRecovery preference (default off)', () => {
      expect(shouldShowNotification('cart_recovery', DEFAULT_PREFERENCES)).toBe(false);
      expect(
        shouldShowNotification('cart_recovery', { ...DEFAULT_PREFERENCES, cartRecovery: true }),
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

    it('includes gamification defaults', () => {
      expect(DEFAULT_PREFERENCES.streakMilestone).toBe(true);
      expect(DEFAULT_PREFERENCES.questComplete).toBe(true);
      expect(DEFAULT_PREFERENCES.dailySpinReminder).toBe(false);
    });
  });

  describe('ANDROID_CHANNEL_CONFIG', () => {
    const allTypes: NotificationType[] = [
      'order_update',
      'promotion',
      'back_in_stock',
      'cart_reminder',
      'cart_recovery',
      'streak_milestone',
      'quest_complete',
      'daily_spin_reminder',
    ];

    it('has a channel config for every notification type', () => {
      for (const t of allTypes) {
        const channel = ANDROID_CHANNEL_CONFIG[t];
        expect(channel.id).toBeTruthy();
        expect(channel.name).toBeTruthy();
        expect(channel.description).toBeTruthy();
        expect(channel.importance).toBeGreaterThanOrEqual(1);
        expect(channel.importance).toBeLessThanOrEqual(5);
      }
    });

    it('uses unique channel IDs', () => {
      const ids = allTypes.map((t) => ANDROID_CHANNEL_CONFIG[t].id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('order_update has HIGH importance', () => {
      expect(ANDROID_CHANNEL_CONFIG.order_update.importance).toBe(4);
    });

    it('cart_reminder has LOW importance', () => {
      expect(ANDROID_CHANNEL_CONFIG.cart_reminder.importance).toBe(2);
    });

    it('cart_recovery has LOW importance', () => {
      expect(ANDROID_CHANNEL_CONFIG.cart_recovery.importance).toBe(2);
    });

    it('gamification channels have DEFAULT or higher importance', () => {
      expect(ANDROID_CHANNEL_CONFIG.streak_milestone.importance).toBeGreaterThanOrEqual(3);
      expect(ANDROID_CHANNEL_CONFIG.quest_complete.importance).toBeGreaterThanOrEqual(3);
      expect(ANDROID_CHANNEL_CONFIG.daily_spin_reminder.importance).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getChannelId', () => {
    it('returns correct channel ID for each type', () => {
      expect(getChannelId('order_update')).toBe('orders');
      expect(getChannelId('promotion')).toBe('promotions');
      expect(getChannelId('back_in_stock')).toBe('back-in-stock');
      expect(getChannelId('cart_reminder')).toBe('cart-reminders');
    });

    it('returns channel IDs for gamification types', () => {
      expect(getChannelId('streak_milestone')).toBeTruthy();
      expect(getChannelId('quest_complete')).toBeTruthy();
      expect(getChannelId('daily_spin_reminder')).toBeTruthy();
    });
  });

  describe('NOTIFICATION_TYPE_CONFIG', () => {
    const allTypes: NotificationType[] = [
      'order_update',
      'promotion',
      'back_in_stock',
      'cart_reminder',
      'cart_recovery',
      'streak_milestone',
      'quest_complete',
      'daily_spin_reminder',
    ];

    it('has config for all notification types', () => {
      for (const t of allTypes) {
        expect(NOTIFICATION_TYPE_CONFIG[t].label).toBeTruthy();
        expect(NOTIFICATION_TYPE_CONFIG[t].description).toBeTruthy();
        expect(NOTIFICATION_TYPE_CONFIG[t].prefKey).toBeTruthy();
      }
    });

    it('gamification types map to correct prefKeys', () => {
      expect(NOTIFICATION_TYPE_CONFIG.streak_milestone.prefKey).toBe('streakMilestone');
      expect(NOTIFICATION_TYPE_CONFIG.quest_complete.prefKey).toBe('questComplete');
      expect(NOTIFICATION_TYPE_CONFIG.daily_spin_reminder.prefKey).toBe('dailySpinReminder');
    });
  });

  describe('shouldShowNotification — gamification types', () => {
    it('shows streak_milestone when enabled', () => {
      expect(
        shouldShowNotification('streak_milestone', {
          ...DEFAULT_PREFERENCES,
          streakMilestone: true,
        }),
      ).toBe(true);
    });

    it('hides streak_milestone when disabled', () => {
      expect(
        shouldShowNotification('streak_milestone', {
          ...DEFAULT_PREFERENCES,
          streakMilestone: false,
        }),
      ).toBe(false);
    });

    it('shows quest_complete when enabled', () => {
      expect(
        shouldShowNotification('quest_complete', { ...DEFAULT_PREFERENCES, questComplete: true }),
      ).toBe(true);
    });

    it('hides quest_complete when disabled', () => {
      expect(
        shouldShowNotification('quest_complete', { ...DEFAULT_PREFERENCES, questComplete: false }),
      ).toBe(false);
    });

    it('hides daily_spin_reminder by default', () => {
      expect(shouldShowNotification('daily_spin_reminder', DEFAULT_PREFERENCES)).toBe(false);
    });

    it('shows daily_spin_reminder when enabled', () => {
      expect(
        shouldShowNotification('daily_spin_reminder', {
          ...DEFAULT_PREFERENCES,
          dailySpinReminder: true,
        }),
      ).toBe(true);
    });
  });

  describe('getDeepLinkForNotification — gamification types', () => {
    it('streak_milestone routes to gamification screen', () => {
      const link = getDeepLinkForNotification('streak_milestone');
      expect(link).toMatch(/carolinafutons:\/\//);
    });

    it('quest_complete routes to challenges or gamification screen', () => {
      const link = getDeepLinkForNotification('quest_complete');
      expect(link).toMatch(/carolinafutons:\/\//);
    });

    it('daily_spin_reminder routes to daily spin screen', () => {
      const link = getDeepLinkForNotification('daily_spin_reminder');
      expect(link).toMatch(/carolinafutons:\/\//);
    });
  });

  // ── registerPushToken ───────────────────────────────────────────────────

  describe('registerPushToken', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      global.fetch = originalFetch;
      jest.useRealTimers();
    });

    it('sends token and platform to push token endpoint', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      await registerPushToken('ExponentPushToken[abc123]');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.wixapis.com/v1/push-tokens',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('ExponentPushToken[abc123]'),
        }),
      );
    });

    it('returns successfully on 200 OK', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      await expect(registerPushToken('token')).resolves.toBeUndefined();
    });

    it('throws immediately on 4xx client error (no retry)', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400 });

      await expect(registerPushToken('token')).rejects.toThrow(
        'Push token registration failed: 400',
      );
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('throws immediately on 403 forbidden', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 });

      await expect(registerPushToken('token')).rejects.toThrow(
        'Push token registration failed: 403',
      );
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('retries on 5xx server error and succeeds', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true });

      const promise = registerPushToken('token');

      // Advance past first backoff (2^0 * 1000 = 1s)
      await jest.advanceTimersByTimeAsync(1000);

      await expect(promise).resolves.toBeUndefined();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('throws after max retries exhausted on server errors', async () => {
      jest.useRealTimers();
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

      // With real timers, the backoff delays are real but the function
      // retries quickly since we use short delays in test. Override the delay.
      // Instead: just verify the error after all attempts.
      await expect(registerPushToken('token')).rejects.toThrow(
        'Push token registration failed: 503',
      );
      expect(global.fetch).toHaveBeenCalledTimes(3);
    }, 15000);

    it('retries on network errors (fetch throws)', async () => {
      jest.useRealTimers();
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network request failed'))
        .mockResolvedValueOnce({ ok: true });

      await expect(registerPushToken('token')).resolves.toBeUndefined();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    }, 10000);

    it('wraps non-Error fetch throws', async () => {
      jest.useRealTimers();
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce('string error')
        .mockResolvedValueOnce({ ok: true });

      await expect(registerPushToken('token')).resolves.toBeUndefined();
    }, 10000);

    it('throws last error after all retries fail on network errors', async () => {
      jest.useRealTimers();
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockRejectedValueOnce(new Error('offline'))
        .mockRejectedValueOnce(new Error('offline'));

      await expect(registerPushToken('token')).rejects.toThrow('offline');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    }, 15000);
  });
});
