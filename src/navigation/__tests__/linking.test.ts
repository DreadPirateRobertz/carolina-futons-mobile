import { linkingConfig, SUPPORTED_PATHS } from '../linking';
import { getStateFromPath } from '@react-navigation/native';

/** Helper: resolve a URL path to the deepest screen name using linkingConfig.getStateFromPath for normalization */
function getScreen(path: string): string {
  const resolver = linkingConfig.getStateFromPath ?? getStateFromPath;
  const state = resolver(path, linkingConfig.config!);
  if (!state) return 'NO_MATCH';
  let current = state.routes[state.routes.length - 1];
  while (current.state) {
    const nested = current.state as any;
    current = nested.routes[nested.routes.length - 1];
  }
  return current.name;
}

/** Helper: resolve a URL path to the deepest screen's params */
function getParams(path: string): Record<string, any> | undefined {
  const resolver = linkingConfig.getStateFromPath ?? getStateFromPath;
  const state = resolver(path, linkingConfig.config!);
  if (!state) return undefined;
  let current = state.routes[state.routes.length - 1];
  while (current.state) {
    const nested = current.state as any;
    current = nested.routes[nested.routes.length - 1];
  }
  return current.params as Record<string, any> | undefined;
}

describe('linkingConfig', () => {
  it('has custom scheme prefix', () => {
    expect(linkingConfig.prefixes).toContain('carolinafutons://');
  });

  it('has universal link prefix', () => {
    expect(linkingConfig.prefixes).toContain('https://carolinafutons.com');
  });

  it('has www universal link prefix', () => {
    expect(linkingConfig.prefixes).toContain('https://www.carolinafutons.com');
  });

  const screens = linkingConfig.config!.screens as any;

  it('maps Home screen inside Tabs', () => {
    expect(screens.Tabs.screens.Home).toBe('home');
  });

  it('maps Shop screen inside Tabs', () => {
    expect(screens.Tabs.screens.Shop).toBe('shop');
  });

  it('maps Category screen with slug param', () => {
    expect(screens.Category).toBe('category/:slug');
  });

  it('maps ProductDetail screen with slug param', () => {
    const pd = screens.ProductDetail;
    expect(typeof pd).toBe('object');
    expect((pd as { path: string }).path).toBe('product/:slug');
  });

  it('maps Cart screen inside Tabs', () => {
    expect(screens.Tabs.screens.Cart).toBe('cart');
  });

  it('maps Checkout screen', () => {
    expect(screens.Checkout).toBe('checkout');
  });

  it('maps OrderHistory screen', () => {
    expect(screens.OrderHistory).toBe('orders');
  });

  it('maps OrderDetail screen with orderId param', () => {
    expect(screens.OrderDetail).toBe('orders/:orderId');
  });

  it('maps Account screen inside Tabs', () => {
    expect(screens.Tabs.screens.Account).toBe('account');
  });

  it('maps Login screen', () => {
    expect(screens.Login).toBe('login');
  });

  it('maps SignUp screen', () => {
    expect(screens.SignUp).toBe('signup');
  });

  it('maps NotificationPreferences screen', () => {
    expect(screens.NotificationPreferences).toBe('notifications');
  });

  it('maps AR screen', () => {
    expect(screens.AR).toBe('ar');
  });

  it('maps ForgotPassword screen', () => {
    expect(screens.ForgotPassword).toBe('forgot-password');
  });
});

describe('SUPPORTED_PATHS', () => {
  it('includes home', () => {
    expect(SUPPORTED_PATHS).toContain('home');
  });

  it('includes shop', () => {
    expect(SUPPORTED_PATHS).toContain('shop');
  });

  it('includes cart', () => {
    expect(SUPPORTED_PATHS).toContain('cart');
  });

  it('includes checkout', () => {
    expect(SUPPORTED_PATHS).toContain('checkout');
  });

  it('includes account', () => {
    expect(SUPPORTED_PATHS).toContain('account');
  });

  it('includes login', () => {
    expect(SUPPORTED_PATHS).toContain('login');
  });

  it('includes orders', () => {
    expect(SUPPORTED_PATHS).toContain('orders');
  });

  it('includes notifications', () => {
    expect(SUPPORTED_PATHS).toContain('notifications');
  });

  it('includes ar', () => {
    expect(SUPPORTED_PATHS).toContain('ar');
  });

  it('includes wishlist', () => {
    expect(SUPPORTED_PATHS).toContain('wishlist');
  });

  it('includes stores', () => {
    expect(SUPPORTED_PATHS).toContain('stores');
  });

  it('includes store-locator', () => {
    expect(SUPPORTED_PATHS).toContain('store-locator');
  });

  it('includes forgot-password', () => {
    expect(SUPPORTED_PATHS).toContain('forgot-password');
  });

  it('includes collections', () => {
    expect(SUPPORTED_PATHS).toContain('collections');
  });
});

describe('deep link route resolution (getStateFromPath)', () => {
  describe('product pages', () => {
    it('resolves product/:slug to ProductDetail', () => {
      expect(getScreen('product/asheville-full')).toBe('ProductDetail');
    });

    it('passes slug param to ProductDetail', () => {
      expect(getParams('product/asheville-full')).toEqual({ slug: 'asheville-full' });
    });

    it('handles hyphenated product slugs', () => {
      expect(getParams('product/carolina-classic-queen')).toEqual({
        slug: 'carolina-classic-queen',
      });
    });

    it('resolves /products/:slug (plural) to ProductDetail', () => {
      expect(getScreen('/products/asheville-full')).toBe('ProductDetail');
    });

    it('passes slug param from /products/:slug (plural)', () => {
      expect(getParams('/products/asheville-full')).toEqual({ slug: 'asheville-full' });
    });
  });

  describe('categories', () => {
    it('resolves category/:slug to Category', () => {
      expect(getScreen('category/frames')).toBe('Category');
    });

    it('passes slug param to Category', () => {
      expect(getParams('category/frames')).toEqual({ slug: 'frames' });
    });
  });

  describe('order tracking', () => {
    it('resolves /orders to OrderHistory', () => {
      expect(getScreen('orders')).toBe('OrderHistory');
    });

    it('resolves /orders/:orderId to OrderDetail', () => {
      expect(getScreen('orders/ord-12345')).toBe('OrderDetail');
    });

    it('passes orderId param to OrderDetail', () => {
      expect(getParams('orders/ord-12345')).toEqual({ orderId: 'ord-12345' });
    });
  });

  describe('tab screens', () => {
    it('resolves /home to Home tab', () => {
      expect(getScreen('home')).toBe('Home');
    });

    it('resolves /shop to Shop tab', () => {
      expect(getScreen('shop')).toBe('Shop');
    });

    it('resolves /cart to Cart tab', () => {
      expect(getScreen('cart')).toBe('Cart');
    });

    it('resolves /account to Account tab', () => {
      expect(getScreen('account')).toBe('Account');
    });
  });

  describe('store pages', () => {
    it('resolves /stores to StoreLocator', () => {
      expect(getScreen('stores')).toBe('StoreLocator');
    });

    it('resolves /store-locator to StoreLocator', () => {
      expect(getScreen('store-locator')).toBe('StoreLocator');
    });

    it('resolves /stores/:storeId to StoreDetail', () => {
      expect(getScreen('stores/charlotte')).toBe('StoreDetail');
    });

    it('passes storeId param to StoreDetail', () => {
      expect(getParams('stores/charlotte')).toEqual({ storeId: 'charlotte' });
    });
  });

  describe('other screens', () => {
    it('resolves /checkout', () => {
      expect(getScreen('checkout')).toBe('Checkout');
    });

    it('resolves /login', () => {
      expect(getScreen('login')).toBe('Login');
    });

    it('resolves /signup', () => {
      expect(getScreen('signup')).toBe('SignUp');
    });

    it('resolves /wishlist', () => {
      expect(getScreen('wishlist')).toBe('Wishlist');
    });

    it('resolves /ar', () => {
      expect(getScreen('ar')).toBe('AR');
    });

    it('resolves /notifications', () => {
      expect(getScreen('notifications')).toBe('NotificationPreferences');
    });

    it('resolves /forgot-password', () => {
      expect(getScreen('forgot-password')).toBe('ForgotPassword');
    });

    it('resolves /collections', () => {
      expect(getScreen('collections')).toBe('Collections');
    });

    it('resolves /collections/:slug', () => {
      expect(getScreen('collections/mattresses')).toBe('CollectionDetail');
    });

    it('passes slug param to CollectionDetail', () => {
      expect(getParams('collections/mattresses')).toEqual({ slug: 'mattresses' });
    });
  });
});
