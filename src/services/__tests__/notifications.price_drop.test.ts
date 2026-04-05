/**
 * TDD tests for price_drop notification type additions to notifications.ts.
 *
 * Tests:
 *  - price_drop is a valid NotificationType (compile-time covered by TypeScript)
 *  - getDeepLinkForNotification('price_drop', { product_slug }) → PDP deep link
 *  - getDeepLinkForNotification('price_drop', no data) → shop fallback
 *  - shouldShowNotification('price_drop', prefs) respects priceDropAlerts pref
 *  - getChannelId('price_drop') returns valid channel ID string
 *  - ANDROID_CHANNEL_CONFIG has price_drop entry with id, name, importance
 *  - NOTIFICATION_TYPE_CONFIG has price_drop with prefKey='priceDropAlerts'
 *  - DEFAULT_PREFERENCES includes priceDropAlerts
 *  - NotificationRouter: routeNotificationTap price_drop routes to ProductDetail with slug
 *
 * @bead cm-pda
 */

import {
  getDeepLinkForNotification,
  shouldShowNotification,
  getChannelId,
  ANDROID_CHANNEL_CONFIG,
  NOTIFICATION_TYPE_CONFIG,
  DEFAULT_PREFERENCES,
  type NotificationPreferences,
} from '../notifications';

import { routeNotificationTap } from '@/navigation/NotificationRouter';

// ── getDeepLinkForNotification ────────────────────────────────────────────────

describe('getDeepLinkForNotification — price_drop', () => {
  it('returns PDP deep link using product_slug from data', () => {
    const link = getDeepLinkForNotification('price_drop', { product_slug: 'asheville-full' });
    expect(link).toBe('carolinafutons://product/asheville-full');
  });

  it('returns shop fallback when no product_slug in data', () => {
    const link = getDeepLinkForNotification('price_drop', {});
    expect(link).toBe('carolinafutons://shop');
  });

  it('returns shop fallback when data is undefined', () => {
    const link = getDeepLinkForNotification('price_drop', undefined);
    expect(link).toBe('carolinafutons://shop');
  });

  it('prefers product_id payload key when present (existing behaviour)', () => {
    // product_id in payload is handled by getDeepLinkFromPayload before the switch
    const link = getDeepLinkForNotification('price_drop', { product_id: 'pisgah-twin' });
    expect(link).toBe('carolinafutons://product/pisgah-twin');
  });
});

// ── shouldShowNotification ────────────────────────────────────────────────────

describe('shouldShowNotification — price_drop', () => {
  it('returns true when priceDropAlerts=true', () => {
    const prefs: NotificationPreferences = { ...DEFAULT_PREFERENCES, priceDropAlerts: true };
    expect(shouldShowNotification('price_drop', prefs)).toBe(true);
  });

  it('returns false when priceDropAlerts=false', () => {
    const prefs: NotificationPreferences = { ...DEFAULT_PREFERENCES, priceDropAlerts: false };
    expect(shouldShowNotification('price_drop', prefs)).toBe(false);
  });
});

// ── DEFAULT_PREFERENCES ───────────────────────────────────────────────────────

describe('DEFAULT_PREFERENCES', () => {
  it('includes priceDropAlerts field', () => {
    expect(Object.prototype.hasOwnProperty.call(DEFAULT_PREFERENCES, 'priceDropAlerts')).toBe(true);
  });

  it('priceDropAlerts defaults to true', () => {
    expect(DEFAULT_PREFERENCES.priceDropAlerts).toBe(true);
  });
});

// ── NOTIFICATION_TYPE_CONFIG ──────────────────────────────────────────────────

describe('NOTIFICATION_TYPE_CONFIG — price_drop', () => {
  it('has an entry for price_drop', () => {
    expect(NOTIFICATION_TYPE_CONFIG.price_drop).toBeDefined();
  });

  it('prefKey is priceDropAlerts', () => {
    expect(NOTIFICATION_TYPE_CONFIG.price_drop.prefKey).toBe('priceDropAlerts');
  });

  it('has a non-empty label', () => {
    expect(typeof NOTIFICATION_TYPE_CONFIG.price_drop.label).toBe('string');
    expect(NOTIFICATION_TYPE_CONFIG.price_drop.label.length).toBeGreaterThan(0);
  });

  it('has a non-empty description', () => {
    expect(typeof NOTIFICATION_TYPE_CONFIG.price_drop.description).toBe('string');
    expect(NOTIFICATION_TYPE_CONFIG.price_drop.description.length).toBeGreaterThan(0);
  });
});

// ── ANDROID_CHANNEL_CONFIG ────────────────────────────────────────────────────

describe('ANDROID_CHANNEL_CONFIG — price_drop', () => {
  it('has an entry for price_drop', () => {
    expect(ANDROID_CHANNEL_CONFIG.price_drop).toBeDefined();
  });

  it('channel id is a non-empty string', () => {
    expect(typeof ANDROID_CHANNEL_CONFIG.price_drop.id).toBe('string');
    expect(ANDROID_CHANNEL_CONFIG.price_drop.id.length).toBeGreaterThan(0);
  });

  it('importance is HIGH (4) — price drops are actionable', () => {
    expect(ANDROID_CHANNEL_CONFIG.price_drop.importance).toBe(4);
  });
});

// ── getChannelId ──────────────────────────────────────────────────────────────

describe('getChannelId — price_drop', () => {
  it('returns the price_drop channel ID string', () => {
    const id = getChannelId('price_drop');
    expect(typeof id).toBe('string');
    expect(id).toBe(ANDROID_CHANNEL_CONFIG.price_drop.id);
  });
});

// ── NotificationRouter ────────────────────────────────────────────────────────

describe('routeNotificationTap — price_drop', () => {
  it('navigates to ProductDetail with the productSlug as slug param', () => {
    const mockNavigate = jest.fn();
    const mockNavigation = { navigate: mockNavigate };

    routeNotificationTap({ type: 'price_drop', productSlug: 'asheville-full' }, mockNavigation);

    expect(mockNavigate).toHaveBeenCalledWith('ProductDetail', { slug: 'asheville-full' });
  });

  it('uses the exact productSlug value from payload', () => {
    const mockNavigate = jest.fn();
    routeNotificationTap(
      { type: 'price_drop', productSlug: 'biltmore-loveseat' },
      {
        navigate: mockNavigate,
      },
    );
    expect(mockNavigate).toHaveBeenCalledWith('ProductDetail', { slug: 'biltmore-loveseat' });
  });
});
