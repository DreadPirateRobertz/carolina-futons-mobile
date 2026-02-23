import { linkingConfig, SUPPORTED_PATHS } from '../linking';

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
});
