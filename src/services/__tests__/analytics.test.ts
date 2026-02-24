import {
  trackEvent,
  trackScreenView,
  identify,
  reset,
  setEnabled,
  isEnabled,
  getUserId,
  getEventBuffer,
  clearEventBuffer,
  getEventsByName,
  registerProvider,
  events,
  type AnalyticsProvider,
} from '../analytics';

// Reset state before each test
beforeEach(() => {
  clearEventBuffer();
  reset();
  setEnabled(true);
  registerProvider(null as unknown as AnalyticsProvider); // clear provider
});

describe('analytics', () => {
  describe('trackEvent', () => {
    it('adds event to buffer', () => {
      trackEvent('add_to_cart', { product_id: 'abc' });
      const buffer = getEventBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].name).toBe('add_to_cart');
      expect(buffer[0].properties).toEqual({ product_id: 'abc' });
    });

    it('includes timestamp', () => {
      const before = Date.now();
      trackEvent('search');
      const after = Date.now();
      const event = getEventBuffer()[0];
      expect(event.timestamp).toBeGreaterThanOrEqual(before);
      expect(event.timestamp).toBeLessThanOrEqual(after);
    });

    it('does not track when disabled', () => {
      setEnabled(false);
      trackEvent('add_to_cart');
      expect(getEventBuffer()).toHaveLength(0);
    });

    it('caps buffer at 500 events', () => {
      for (let i = 0; i < 510; i++) {
        trackEvent('search', { i });
      }
      expect(getEventBuffer()).toHaveLength(500);
    });

    it('works without properties', () => {
      trackEvent('app_open');
      expect(getEventBuffer()[0].properties).toBeUndefined();
    });
  });

  describe('trackScreenView', () => {
    it('tracks screen_view event with screen name', () => {
      trackScreenView('ProductDetail', { product_id: 'abc' });
      const buffer = getEventBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].name).toBe('screen_view');
      expect(buffer[0].properties).toEqual({
        screen_name: 'ProductDetail',
        product_id: 'abc',
      });
    });

    it('works without extra properties', () => {
      trackScreenView('Home');
      expect(getEventBuffer()[0].properties).toEqual({ screen_name: 'Home' });
    });
  });

  describe('identify', () => {
    it('sets user ID', () => {
      identify('user-123');
      expect(getUserId()).toBe('user-123');
    });

    it('accepts user properties', () => {
      identify('user-123', { email: 'test@example.com' });
      expect(getUserId()).toBe('user-123');
    });
  });

  describe('reset', () => {
    it('clears user ID', () => {
      identify('user-123');
      reset();
      expect(getUserId()).toBeNull();
    });

    it('clears event buffer', () => {
      trackEvent('search');
      trackEvent('add_to_cart');
      reset();
      expect(getEventBuffer()).toHaveLength(0);
    });
  });

  describe('setEnabled / isEnabled', () => {
    it('starts enabled', () => {
      expect(isEnabled()).toBe(true);
    });

    it('can be disabled', () => {
      setEnabled(false);
      expect(isEnabled()).toBe(false);
    });

    it('can be re-enabled', () => {
      setEnabled(false);
      setEnabled(true);
      expect(isEnabled()).toBe(true);
    });
  });

  describe('getEventsByName', () => {
    it('filters events by name', () => {
      trackEvent('search', { query: 'futon' });
      trackEvent('add_to_cart', { product_id: 'abc' });
      trackEvent('search', { query: 'mattress' });
      const searches = getEventsByName('search');
      expect(searches).toHaveLength(2);
      expect(searches[0].properties).toEqual({ query: 'futon' });
      expect(searches[1].properties).toEqual({ query: 'mattress' });
    });

    it('returns empty array when no matches', () => {
      trackEvent('search');
      expect(getEventsByName('purchase')).toHaveLength(0);
    });
  });

  describe('clearEventBuffer', () => {
    it('removes all events', () => {
      trackEvent('search');
      trackEvent('add_to_cart');
      clearEventBuffer();
      expect(getEventBuffer()).toHaveLength(0);
    });
  });

  describe('provider delegation', () => {
    it('delegates to registered provider', () => {
      const provider: AnalyticsProvider = {
        trackEvent: jest.fn(),
        trackScreenView: jest.fn(),
        identify: jest.fn(),
        reset: jest.fn(),
        setEnabled: jest.fn(),
      };
      registerProvider(provider);
      trackEvent('add_to_cart', { product_id: 'abc' });
      expect(provider.trackEvent).toHaveBeenCalledWith('add_to_cart', {
        product_id: 'abc',
      });
    });

    it('delegates identify to provider', () => {
      const provider: AnalyticsProvider = {
        trackEvent: jest.fn(),
        trackScreenView: jest.fn(),
        identify: jest.fn(),
        reset: jest.fn(),
        setEnabled: jest.fn(),
      };
      registerProvider(provider);
      identify('user-456', { email: 'x@y.com' });
      expect(provider.identify).toHaveBeenCalledWith('user-456', {
        email: 'x@y.com',
      });
    });

    it('delegates reset to provider', () => {
      const provider: AnalyticsProvider = {
        trackEvent: jest.fn(),
        trackScreenView: jest.fn(),
        identify: jest.fn(),
        reset: jest.fn(),
        setEnabled: jest.fn(),
      };
      registerProvider(provider);
      reset();
      expect(provider.reset).toHaveBeenCalled();
    });
  });

  describe('event helpers', () => {
    it('events.addToCart tracks correctly', () => {
      events.addToCart('prod-1', 349, 2);
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('add_to_cart');
      expect(ev.properties).toEqual({ product_id: 'prod-1', price: 349, quantity: 2 });
    });

    it('events.search tracks correctly', () => {
      events.search('futon', 5);
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('search');
      expect(ev.properties).toEqual({ query: 'futon', result_count: 5 });
    });

    it('events.viewProduct tracks correctly', () => {
      events.viewProduct('prod-1', 'shop');
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('view_product');
      expect(ev.properties).toEqual({ product_id: 'prod-1', source: 'shop' });
    });

    it('events.openAR tracks correctly', () => {
      events.openAR('prod-1');
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('open_ar');
      expect(ev.properties).toEqual({ product_id: 'prod-1' });
    });

    it('events.purchase tracks correctly', () => {
      events.purchase('order-1', 698, 2);
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('purchase');
      expect(ev.properties).toEqual({ order_id: 'order-1', total: 698, item_count: 2 });
    });

    it('events.selectFabric tracks correctly', () => {
      events.selectFabric('prod-1', 'mountain-blue');
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('select_fabric');
      expect(ev.properties).toEqual({ product_id: 'prod-1', fabric_id: 'mountain-blue' });
    });

    it('events.addToWishlist tracks correctly', () => {
      events.addToWishlist('prod-1', 349);
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('add_to_wishlist');
      expect(ev.properties).toEqual({ product_id: 'prod-1', price: 349 });
    });

    it('events.shareWishlist tracks correctly', () => {
      events.shareWishlist(3);
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('share_wishlist');
      expect(ev.properties).toEqual({ item_count: 3 });
    });

    it('events.deepLinkOpened tracks correctly', () => {
      events.deepLinkOpened('carolinafutons://product/abc', 'ProductDetail');
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('deep_link_opened');
      expect(ev.properties).toEqual({
        url: 'carolinafutons://product/abc',
        screen: 'ProductDetail',
      });
    });

    it('events.filterCategory tracks correctly', () => {
      events.filterCategory('futons');
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('filter_category');
      expect(ev.properties).toEqual({ category: 'futons' });
    });

    it('events.sortProducts tracks correctly', () => {
      events.sortProducts('price-asc');
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('sort_products');
      expect(ev.properties).toEqual({ sort_by: 'price-asc' });
    });

    it('events.removeFromCart tracks correctly', () => {
      events.removeFromCart('prod-1');
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('remove_from_cart');
    });

    it('events.removeFromWishlist tracks correctly', () => {
      events.removeFromWishlist('prod-1');
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('remove_from_wishlist');
    });

    it('events.arViewInRoomTap tracks correctly', () => {
      events.arViewInRoomTap('prod-asheville-full', 'futons');
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('ar_view_in_room_tap');
      expect(ev.properties).toEqual({ product_id: 'prod-asheville-full', category: 'futons' });
    });

    it('events.arModelSelected tracks correctly', () => {
      events.arModelSelected('asheville-full', 'prod-asheville-full');
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('ar_model_selected');
      expect(ev.properties).toEqual({
        model_id: 'asheville-full',
        product_id: 'prod-asheville-full',
      });
    });

    it('events.arAddToCart tracks correctly', () => {
      events.arAddToCart('asheville-full', 'mountain-blue', 378);
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('ar_add_to_cart');
      expect(ev.properties).toEqual({
        model_id: 'asheville-full',
        fabric_id: 'mountain-blue',
        price: 378,
      });
    });

    it('events.arScreenshot tracks correctly', () => {
      events.arScreenshot('asheville-full', 'mountain-blue');
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('ar_screenshot');
      expect(ev.properties).toEqual({ model_id: 'asheville-full', fabric_id: 'mountain-blue' });
    });

    it('events.arShare tracks correctly', () => {
      events.arShare('asheville-full', 'slate-gray');
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('ar_share');
      expect(ev.properties).toEqual({ model_id: 'asheville-full', fabric_id: 'slate-gray' });
    });

    it('events.arSaveToGallery tracks correctly', () => {
      events.arSaveToGallery('asheville-full', 'natural-linen');
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('ar_save_to_gallery');
      expect(ev.properties).toEqual({ model_id: 'asheville-full', fabric_id: 'natural-linen' });
    });

    it('events.arSaveToWishlist tracks correctly', () => {
      events.arSaveToWishlist('asheville-full', 'mountain-blue');
      const ev = getEventBuffer()[0];
      expect(ev.name).toBe('ar_save_to_wishlist');
      expect(ev.properties).toEqual({ model_id: 'asheville-full', fabric_id: 'mountain-blue' });
    });
  });
});
