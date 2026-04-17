import {
  parseDeepLink,
  extractUTM,
  resolveRoute,
  buildProductShareUrl,
  buildCategoryShareUrl,
  buildShareUrlWithUTM,
  storePendingDeepLink,
  consumePendingDeepLink,
  type ParsedDeepLink,
} from '../deepLink';

describe('deepLink', () => {
  describe('parseDeepLink', () => {
    it('parses custom scheme URL', () => {
      const result = parseDeepLink('carolinafutons://product/asheville-full');
      expect(result.path).toBe('product/asheville-full');
      expect(result.raw).toBe('carolinafutons://product/asheville-full');
    });

    it('parses universal link', () => {
      const result = parseDeepLink('https://carolinafutons.com/product/asheville-full');
      expect(result.path).toBe('product/asheville-full');
    });

    it('parses universal link with www', () => {
      const result = parseDeepLink('https://www.carolinafutons.com/category/frames');
      expect(result.path).toBe('category/frames');
    });

    it('parses query params', () => {
      const result = parseDeepLink('carolinafutons://shop?sort=price&color=blue');
      expect(result.params.sort).toBe('price');
      expect(result.params.color).toBe('blue');
    });

    it('decodes URL-encoded params', () => {
      const result = parseDeepLink('carolinafutons://shop?name=hello%20world');
      expect(result.params.name).toBe('hello world');
    });

    it('extracts UTM params', () => {
      const result = parseDeepLink(
        'https://carolinafutons.com/product/asheville-full?utm_source=email&utm_medium=newsletter&utm_campaign=spring',
      );
      expect(result.utm).not.toBeNull();
      expect(result.utm!.source).toBe('email');
      expect(result.utm!.medium).toBe('newsletter');
      expect(result.utm!.campaign).toBe('spring');
    });

    it('returns null UTM when no UTM params', () => {
      const result = parseDeepLink('carolinafutons://cart');
      expect(result.utm).toBeNull();
    });

    it('defaults empty path to home', () => {
      const result = parseDeepLink('carolinafutons://');
      expect(result.path).toBe('home');
    });

    it('strips leading and trailing slashes from path', () => {
      const result = parseDeepLink('carolinafutons:///shop/');
      expect(result.path).toBe('shop');
    });

    it('ignores params with missing value', () => {
      const result = parseDeepLink('carolinafutons://shop?keyonly&a=b');
      expect(result.params.keyonly).toBeUndefined();
      expect(result.params.a).toBe('b');
    });
  });

  describe('extractUTM', () => {
    it('extracts all UTM params', () => {
      const utm = extractUTM({
        utm_source: 'email',
        utm_medium: 'newsletter',
        utm_campaign: 'spring',
        utm_content: 'hero',
        utm_term: 'futon',
      });
      expect(utm).toEqual({
        source: 'email',
        medium: 'newsletter',
        campaign: 'spring',
        content: 'hero',
        term: 'futon',
      });
    });

    it('returns null when no source, medium, or campaign', () => {
      const utm = extractUTM({ utm_content: 'hero', utm_term: 'futon' });
      expect(utm).toBeNull();
    });

    it('returns UTM with only source', () => {
      const utm = extractUTM({ utm_source: 'google' });
      expect(utm).not.toBeNull();
      expect(utm!.source).toBe('google');
      expect(utm!.medium).toBeNull();
    });

    it('returns UTM with only campaign', () => {
      const utm = extractUTM({ utm_campaign: 'summer-sale' });
      expect(utm).not.toBeNull();
      expect(utm!.campaign).toBe('summer-sale');
    });

    it('returns null for empty params', () => {
      expect(extractUTM({})).toBeNull();
    });
  });

  describe('resolveRoute', () => {
    function makeLink(path: string): ParsedDeepLink {
      return { path, params: {}, utm: null, raw: '' };
    }

    it('resolves home', () => {
      expect(resolveRoute(makeLink('home'))).toEqual({ screen: 'Home' });
    });

    it('resolves empty path to home', () => {
      expect(resolveRoute(makeLink(''))).toEqual({ screen: 'Home' });
    });

    it('resolves shop', () => {
      expect(resolveRoute(makeLink('shop'))).toEqual({ screen: 'Shop' });
    });

    it('resolves category with slug', () => {
      expect(resolveRoute(makeLink('category/frames'))).toEqual({
        screen: 'Category',
        params: { slug: 'frames' },
      });
    });

    it('resolves category without slug to shop', () => {
      expect(resolveRoute(makeLink('category'))).toEqual({ screen: 'Shop' });
    });

    it('resolves product with slug', () => {
      expect(resolveRoute(makeLink('product/asheville-full'))).toEqual({
        screen: 'ProductDetail',
        params: { slug: 'asheville-full' },
      });
    });

    it('resolves product without slug to shop', () => {
      expect(resolveRoute(makeLink('product'))).toEqual({ screen: 'Shop' });
    });

    it('resolves products (plural) with slug to ProductDetail', () => {
      expect(resolveRoute(makeLink('products/asheville-full'))).toEqual({
        screen: 'ProductDetail',
        params: { slug: 'asheville-full' },
      });
    });

    it('resolves products (plural) without slug to shop', () => {
      expect(resolveRoute(makeLink('products'))).toEqual({ screen: 'Shop' });
    });

    it('resolves cart', () => {
      expect(resolveRoute(makeLink('cart'))).toEqual({ screen: 'Cart' });
    });

    it('resolves checkout', () => {
      expect(resolveRoute(makeLink('checkout'))).toEqual({
        screen: 'Checkout',
      });
    });

    it('resolves orders to OrderHistory', () => {
      expect(resolveRoute(makeLink('orders'))).toEqual({
        screen: 'OrderHistory',
      });
    });

    it('resolves orders with ID to OrderDetail', () => {
      expect(resolveRoute(makeLink('orders/abc-123'))).toEqual({
        screen: 'OrderDetail',
        params: { orderId: 'abc-123' },
      });
    });

    it('resolves account', () => {
      expect(resolveRoute(makeLink('account'))).toEqual({
        screen: 'Account',
      });
    });

    it('resolves login', () => {
      expect(resolveRoute(makeLink('login'))).toEqual({ screen: 'Login' });
    });

    it('resolves signin alias', () => {
      expect(resolveRoute(makeLink('signin'))).toEqual({ screen: 'Login' });
    });

    it('resolves wishlist', () => {
      expect(resolveRoute(makeLink('wishlist'))).toEqual({ screen: 'Wishlist' });
    });

    it('resolves ar', () => {
      expect(resolveRoute(makeLink('ar'))).toEqual({ screen: 'AR' });
    });

    it('resolves signup', () => {
      expect(resolveRoute(makeLink('signup'))).toEqual({ screen: 'SignUp' });
    });

    it('resolves notifications', () => {
      expect(resolveRoute(makeLink('notifications'))).toEqual({
        screen: 'NotificationPreferences',
      });
    });

    it('resolves stores to StoreLocator', () => {
      expect(resolveRoute(makeLink('stores'))).toEqual({ screen: 'StoreLocator' });
    });

    it('resolves stores with ID to StoreDetail', () => {
      expect(resolveRoute(makeLink('stores/charlotte'))).toEqual({
        screen: 'StoreDetail',
        params: { storeId: 'charlotte' },
      });
    });

    it('resolves forgot-password', () => {
      expect(resolveRoute(makeLink('forgot-password'))).toEqual({
        screen: 'ForgotPassword',
      });
    });

    it('resolves collections to Collections', () => {
      expect(resolveRoute(makeLink('collections'))).toEqual({
        screen: 'Collections',
      });
    });

    it('resolves collections with slug to CollectionDetail', () => {
      expect(resolveRoute(makeLink('collections/mattresses'))).toEqual({
        screen: 'CollectionDetail',
        params: { slug: 'mattresses' },
      });
    });

    it('resolves unknown path to NotFound', () => {
      expect(resolveRoute(makeLink('unknown/path'))).toEqual({
        screen: 'NotFound',
        params: { path: 'unknown/path' },
      });
    });
  });

  describe('buildProductShareUrl', () => {
    it('builds product URL', () => {
      expect(buildProductShareUrl('asheville-full')).toBe(
        'https://carolinafutons.com/product/asheville-full',
      );
    });
  });

  describe('buildCategoryShareUrl', () => {
    it('builds category URL', () => {
      expect(buildCategoryShareUrl('frames')).toBe('https://carolinafutons.com/category/frames');
    });
  });

  describe('buildShareUrlWithUTM', () => {
    it('appends UTM params', () => {
      const url = buildShareUrlWithUTM('https://carolinafutons.com/product/asheville-full', {
        source: 'app',
        medium: 'share',
        campaign: 'product-share',
      });
      expect(url).toContain('utm_source=app');
      expect(url).toContain('utm_medium=share');
      expect(url).toContain('utm_campaign=product-share');
    });

    it('returns base URL when no UTM params', () => {
      const base = 'https://carolinafutons.com/product/asheville-full';
      expect(buildShareUrlWithUTM(base, {})).toBe(base);
    });

    it('only includes provided UTM params', () => {
      const url = buildShareUrlWithUTM('https://carolinafutons.com/shop', { source: 'app' });
      expect(url).toContain('utm_source=app');
      expect(url).not.toContain('utm_medium');
      expect(url).not.toContain('utm_campaign');
    });

    it('includes content and term when provided', () => {
      const url = buildShareUrlWithUTM('https://carolinafutons.com/shop', {
        source: 'app',
        content: 'hero-banner',
        term: 'futon',
      });
      expect(url).toContain('utm_content=hero-banner');
      expect(url).toContain('utm_term=futon');
    });
  });

  // ── cm-703: gamification route handlers ──────────────────────────────────
  describe('resolveRoute — cm-703 gamification routes', () => {
    it('resolves carolinafutons://challenges to Challenges (no id)', () => {
      const route = resolveRoute(parseDeepLink('carolinafutons://challenges'));
      expect(route.screen).toBe('Challenges');
      expect('params' in route).toBe(false);
    });

    it('resolves carolinafutons://challenges/:id to Challenges with challengeId', () => {
      const route = resolveRoute(parseDeepLink('carolinafutons://challenges/ch-7'));
      expect(route.screen).toBe('Challenges');
      expect('params' in route && route.params).toEqual({ challengeId: 'ch-7' });
    });

    it('resolves carolinafutons://leaderboard to Leaderboard', () => {
      const route = resolveRoute(parseDeepLink('carolinafutons://leaderboard'));
      expect(route.screen).toBe('Leaderboard');
      expect('params' in route).toBe(false);
    });

    it('resolves carolinafutons://badges to AchievementBadges (no id)', () => {
      const route = resolveRoute(parseDeepLink('carolinafutons://badges'));
      expect(route.screen).toBe('AchievementBadges');
      expect('params' in route).toBe(false);
    });

    it('resolves carolinafutons://badges/:id to AchievementBadges with badgeId', () => {
      const route = resolveRoute(parseDeepLink('carolinafutons://badges/first-purchase'));
      expect(route.screen).toBe('AchievementBadges');
      expect('params' in route && route.params).toEqual({ badgeId: 'first-purchase' });
    });

    it('resolves carolinafutons://trails to Trails (no id)', () => {
      const route = resolveRoute(parseDeepLink('carolinafutons://trails'));
      expect(route.screen).toBe('Trails');
      expect('params' in route).toBe(false);
    });

    it('resolves carolinafutons://trails/:id to Trails with trailId', () => {
      const route = resolveRoute(parseDeepLink('carolinafutons://trails/spring'));
      expect(route.screen).toBe('Trails');
      expect('params' in route && route.params).toEqual({ trailId: 'spring' });
    });

    it('resolves universal link https://carolinafutons.com/challenges/ch-1', () => {
      const route = resolveRoute(parseDeepLink('https://carolinafutons.com/challenges/ch-1'));
      expect(route.screen).toBe('Challenges');
      expect('params' in route && route.params).toEqual({ challengeId: 'ch-1' });
    });

    it('keeps UTM extraction working for gamification links', () => {
      const parsed = parseDeepLink(
        'https://carolinafutons.com/challenges/ch-1?utm_source=push&utm_medium=app',
      );
      expect(parsed.utm?.source).toBe('push');
      expect(parsed.utm?.medium).toBe('app');
      const route = resolveRoute(parsed);
      expect(route.screen).toBe('Challenges');
      expect('params' in route && route.params).toEqual({ challengeId: 'ch-1' });
    });
  });

  describe('resolveRoute — cm-703 edge cases', () => {
    it('falls through to NotFound for unknown gamification-adjacent paths', () => {
      const route = resolveRoute(parseDeepLink('carolinafutons://gamification/foo'));
      expect(route.screen).toBe('NotFound');
    });

    it('handles trailing slash on /challenges/', () => {
      const route = resolveRoute(parseDeepLink('carolinafutons://challenges/'));
      expect(route.screen).toBe('Challenges');
      expect('params' in route).toBe(false);
    });

    it('handles trailing slash on /badges/', () => {
      const route = resolveRoute(parseDeepLink('carolinafutons://badges/'));
      expect(route.screen).toBe('AchievementBadges');
      expect('params' in route).toBe(false);
    });

    it('ignores extra segments beyond the id (takes first segment)', () => {
      const route = resolveRoute(parseDeepLink('carolinafutons://challenges/ch-1/extra'));
      expect(route.screen).toBe('Challenges');
      expect('params' in route && route.params).toEqual({ challengeId: 'ch-1' });
    });

    it('passes url-encoded id through unchanged (documents current behavior)', () => {
      // parseDeepLink does not decode path segments (only query params), so the
      // raw encoded form flows through to the route. Documented so a future
      // change is intentional.
      const route = resolveRoute(parseDeepLink('carolinafutons://badges/top%20tier'));
      expect(route.screen).toBe('AchievementBadges');
      expect('params' in route && route.params).toEqual({ badgeId: 'top%20tier' });
    });
  });

  describe('deferred deep links', () => {
    it('stores and consumes a pending deep link', () => {
      storePendingDeepLink('carolinafutons://product/test');
      expect(consumePendingDeepLink()).toBe('carolinafutons://product/test');
    });

    it('returns null after consuming', () => {
      storePendingDeepLink('carolinafutons://cart');
      consumePendingDeepLink();
      expect(consumePendingDeepLink()).toBeNull();
    });

    it('returns null when nothing stored', () => {
      // Ensure clean state
      consumePendingDeepLink();
      expect(consumePendingDeepLink()).toBeNull();
    });
  });
});
