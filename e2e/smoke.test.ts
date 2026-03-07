import { device, element, by, expect, waitFor } from 'detox';
import { dismissOnboarding, navigateToTab, waitAndExpectVisible } from './utils';

/**
 * Critical-path smoke test: browse → product detail → add to cart → checkout.
 * Validates the core purchase funnel in a single continuous flow.
 */
describe('Smoke — Critical Purchase Path', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await dismissOnboarding();
  });

  it('should display home screen after launch', async () => {
    await waitAndExpectVisible('home-screen');
  });

  it('should navigate to the Shop tab', async () => {
    await navigateToTab('Shop');
    await waitAndExpectVisible('shop-screen');
    await waitAndExpectVisible('product-list');
  });

  it('should display product cards in the listing', async () => {
    await waitFor(element(by.id('product-card-0')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should open product detail when tapping a product', async () => {
    await element(by.id('product-card-0')).tap();
    await waitAndExpectVisible('product-detail-screen');
  });

  it('should show product name and price on detail screen', async () => {
    await expect(element(by.id('product-name'))).toBeVisible();
    await expect(element(by.id('total-price'))).toBeVisible();
  });

  it('should add the product to cart', async () => {
    await element(by.id('product-detail-screen')).swipe('up', 'slow', 0.5);
    await waitFor(element(by.id('add-to-cart-button')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('add-to-cart-button')).tap();
  });

  it('should navigate to the Cart tab with item present', async () => {
    await element(by.id('detail-back-button')).tap();
    await navigateToTab('Cart');
    await waitAndExpectVisible('cart-screen');
    await expect(element(by.id('cart-empty-state'))).not.toBeVisible();
  });

  it('should display order summary in the cart', async () => {
    await element(by.id('cart-screen')).swipe('up', 'slow', 0.3);
    await waitFor(element(by.id('order-summary')))
      .toBeVisible()
      .withTimeout(5000);
    await expect(element(by.id('cart-subtotal'))).toBeVisible();
    await expect(element(by.id('cart-total'))).toBeVisible();
  });

  it('should navigate to checkout', async () => {
    await waitFor(element(by.id('checkout-button')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('checkout-button')).tap();
    await waitAndExpectVisible('checkout-screen');
  });

  it('should display checkout header and totals', async () => {
    await expect(element(by.id('checkout-header'))).toBeVisible();
    await expect(element(by.id('checkout-totals'))).toBeVisible();
    await expect(element(by.id('checkout-total'))).toBeVisible();
  });

  it('should display payment method options', async () => {
    await element(by.id('checkout-screen')).swipe('up', 'slow', 0.3);
    await waitFor(element(by.id('payment-card')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should select card payment and enable Place Order', async () => {
    await element(by.id('payment-card')).tap();
    await element(by.id('checkout-screen')).swipe('up', 'slow', 0.5);
    await waitFor(element(by.id('place-order-button')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should tap Place Order to submit', async () => {
    await element(by.id('place-order-button')).tap();
    // Payment sheet or confirmation will appear depending on Stripe test config.
    // The smoke test validates the flow reaches the order submission point.
  });
});
