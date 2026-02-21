import {
  initAnalytics,
  isInitialized,
  trackEvent,
  trackScreenView,
  trackAddToCart,
  trackPurchase,
  setUserProperties,
  getUserProperties,
  reportCrash,
  addBreadcrumb,
  getBreadcrumbs,
  getEventLog,
  resetAnalytics,
} from '../analytics';

beforeEach(() => {
  resetAnalytics();
});

describe('analytics', () => {
  describe('initAnalytics', () => {
    it('sets initialized flag', () => {
      expect(isInitialized()).toBe(false);
      initAnalytics();
      expect(isInitialized()).toBe(true);
    });

    it('logs app_open event', () => {
      initAnalytics();
      const events = getEventLog();
      expect(events[0].name).toBe('app_open');
    });
  });

  describe('trackEvent', () => {
    it('logs event with name and params', () => {
      trackEvent('search', { query: 'futon' });
      const events = getEventLog();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('search');
      expect(events[0].params?.query).toBe('futon');
    });

    it('logs event without params', () => {
      trackEvent('app_open');
      expect(getEventLog()[0].params).toBeUndefined();
    });

    it('includes timestamp', () => {
      trackEvent('login');
      expect(getEventLog()[0].timestamp).toBeTruthy();
    });

    it('adds breadcrumb for each event', () => {
      trackEvent('share');
      const crumbs = getBreadcrumbs();
      expect(crumbs.some((c) => c.message.includes('share'))).toBe(true);
    });
  });

  describe('trackScreenView', () => {
    it('logs screen_view event', () => {
      trackScreenView({ screenName: 'Home' });
      const e = getEventLog()[0];
      expect(e.name).toBe('screen_view');
      expect(e.params?.screen_name).toBe('Home');
    });

    it('includes screen class when provided', () => {
      trackScreenView({ screenName: 'Product', screenClass: 'ProductDetailScreen' });
      expect(getEventLog()[0].params?.screen_class).toBe('ProductDetailScreen');
    });
  });

  describe('trackAddToCart', () => {
    it('logs add_to_cart with item details', () => {
      trackAddToCart({
        itemId: 'asheville-full',
        itemName: 'Asheville Full',
        price: 599,
        quantity: 1,
        category: 'frames',
      });
      const e = getEventLog()[0];
      expect(e.name).toBe('add_to_cart');
      expect(e.params?.item_id).toBe('asheville-full');
      expect(e.params?.price).toBe(599);
      expect(e.params?.category).toBe('frames');
    });

    it('omits category when not provided', () => {
      trackAddToCart({
        itemId: 'x',
        itemName: 'X',
        price: 100,
        quantity: 1,
      });
      expect(getEventLog()[0].params?.category).toBeUndefined();
    });
  });

  describe('trackPurchase', () => {
    it('logs purchase with order details', () => {
      trackPurchase('ord-123', 599, [
        { itemId: 'a', itemName: 'A', price: 599, quantity: 1 },
      ]);
      const e = getEventLog()[0];
      expect(e.name).toBe('purchase');
      expect(e.params?.order_id).toBe('ord-123');
      expect(e.params?.value).toBe(599);
      expect(e.params?.item_count).toBe(1);
    });
  });

  describe('setUserProperties / getUserProperties', () => {
    it('defaults to guest', () => {
      expect(getUserProperties().isGuest).toBe(true);
    });

    it('sets authenticated user', () => {
      setUserProperties({ userId: 'u1', email: 'a@b.com', isGuest: false });
      const props = getUserProperties();
      expect(props.userId).toBe('u1');
      expect(props.isGuest).toBe(false);
    });

    it('adds breadcrumb on set', () => {
      setUserProperties({ userId: 'u1', isGuest: false });
      expect(getBreadcrumbs().some((c) => c.category === 'user')).toBe(true);
    });
  });

  describe('reportCrash', () => {
    it('adds crash breadcrumb', () => {
      reportCrash(new Error('test crash'));
      const crumbs = getBreadcrumbs();
      expect(crumbs.some((c) => c.category === 'crash')).toBe(true);
    });

    it('logs crash event with error message', () => {
      reportCrash(new Error('boom'), 'fatal', { screen: 'Cart' });
      const events = getEventLog();
      const crash = events.find((e) => e.params?._crash === true);
      expect(crash).toBeTruthy();
      expect(crash!.params?.error_message).toBe('boom');
      expect(crash!.params?.severity).toBe('fatal');
      expect(crash!.params?.screen).toBe('Cart');
    });

    it('defaults severity to error', () => {
      reportCrash(new Error('oops'));
      const crash = getEventLog().find((e) => e.params?._crash === true);
      expect(crash!.params?.severity).toBe('error');
    });
  });

  describe('breadcrumbs', () => {
    it('stores breadcrumbs in order', () => {
      addBreadcrumb('nav', 'Went to Home', 'info');
      addBreadcrumb('nav', 'Went to Shop', 'info');
      const crumbs = getBreadcrumbs();
      expect(crumbs[0].message).toBe('Went to Home');
      expect(crumbs[1].message).toBe('Went to Shop');
    });

    it('caps at 50 breadcrumbs', () => {
      for (let i = 0; i < 60; i++) {
        addBreadcrumb('test', `crumb-${i}`);
      }
      expect(getBreadcrumbs()).toHaveLength(50);
      // Oldest should be trimmed
      expect(getBreadcrumbs()[0].message).toBe('crumb-10');
    });
  });

  describe('resetAnalytics', () => {
    it('clears all state', () => {
      initAnalytics();
      trackEvent('search');
      setUserProperties({ userId: 'x', isGuest: false });
      resetAnalytics();
      expect(getEventLog()).toHaveLength(0);
      expect(getBreadcrumbs()).toHaveLength(0);
      expect(getUserProperties().isGuest).toBe(true);
      expect(isInitialized()).toBe(false);
    });
  });
});
