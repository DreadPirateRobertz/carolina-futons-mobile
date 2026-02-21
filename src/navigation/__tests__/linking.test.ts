import { linkingConfig, SUPPORTED_PATHS } from '../linking';

describe('linkingConfig', () => {
  it('has custom scheme prefix', () => {
    expect(linkingConfig.prefixes).toContain('carolinafutons://');
  });

  it('has universal link prefix', () => {
    expect(linkingConfig.prefixes).toContain('https://carolinafutons.com');
  });

  it('has www universal link prefix', () => {
    expect(linkingConfig.prefixes).toContain(
      'https://www.carolinafutons.com',
    );
  });

  it('maps Home screen', () => {
    expect(linkingConfig.config.screens.Home).toBe('home');
  });

  it('maps Shop screen', () => {
    expect(linkingConfig.config.screens.Shop).toBe('shop');
  });

  it('maps Category screen with slug param', () => {
    expect(linkingConfig.config.screens.Category).toBe('category/:slug');
  });

  it('maps ProductDetail screen with slug param', () => {
    const pd = linkingConfig.config.screens.ProductDetail;
    expect(typeof pd).toBe('object');
    expect((pd as { path: string }).path).toBe('product/:slug');
  });

  it('maps Cart screen', () => {
    expect(linkingConfig.config.screens.Cart).toBe('cart');
  });

  it('maps Checkout screen', () => {
    expect(linkingConfig.config.screens.Checkout).toBe('checkout');
  });

  it('maps OrderHistory screen', () => {
    expect(linkingConfig.config.screens.OrderHistory).toBe('orders');
  });

  it('maps OrderDetail screen with orderId param', () => {
    expect(linkingConfig.config.screens.OrderDetail).toBe('orders/:orderId');
  });

  it('maps Account screen', () => {
    expect(linkingConfig.config.screens.Account).toBe('account');
  });

  it('maps Login screen', () => {
    expect(linkingConfig.config.screens.Login).toBe('login');
  });

  it('maps SignUp screen', () => {
    expect(linkingConfig.config.screens.SignUp).toBe('signup');
  });

  it('maps NotificationPreferences screen', () => {
    expect(linkingConfig.config.screens.NotificationPreferences).toBe(
      'notifications',
    );
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
});
