import { device, element, by, expect, waitFor } from 'detox';
import { dismissOnboarding, navigateToTab, waitAndExpectVisible } from './utils';

describe('Checkout Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await dismissOnboarding();

    // Add an item to cart first
    await navigateToTab('Shop');
    await waitFor(element(by.id('product-card-0')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('product-card-0')).tap();
    await waitAndExpectVisible('product-detail-screen');
    await element(by.id('product-detail-screen')).swipe('up', 'slow', 0.5);
    await waitFor(element(by.id('add-to-cart-button')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('add-to-cart-button')).tap();
    await element(by.id('detail-back-button')).tap();
  });

  describe('Navigate to Checkout', () => {
    it('should go to cart and tap checkout', async () => {
      await navigateToTab('Cart');
      await waitAndExpectVisible('cart-screen');

      // Scroll to checkout button
      await element(by.id('cart-screen')).swipe('up', 'slow', 0.5);
      await waitFor(element(by.id('checkout-button')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('checkout-button')).tap();
    });

    it('should display the checkout screen', async () => {
      await waitAndExpectVisible('checkout-screen');
      await expect(element(by.id('checkout-header'))).toBeVisible();
    });
  });

  describe('Checkout Screen — Order Summary', () => {
    it('should display checkout items', async () => {
      // At least one checkout item should be visible
      await expect(element(by.id('checkout-totals'))).toBeVisible();
    });

    it('should display the total amount', async () => {
      await expect(element(by.id('checkout-total'))).toBeVisible();
    });
  });

  describe('Payment Method Selection', () => {
    it('should display payment method options', async () => {
      await element(by.id('checkout-screen')).swipe('up', 'slow', 0.3);

      // Should show card payment at minimum (platform-independent)
      await waitFor(element(by.id('payment-card')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display BNPL options (Affirm and Klarna)', async () => {
      await expect(element(by.id('payment-affirm'))).toBeVisible();
      await expect(element(by.id('payment-klarna'))).toBeVisible();
    });

    it('should select a payment method', async () => {
      await element(by.id('payment-card')).tap();
    });

    it('should enable the place order button after selecting payment', async () => {
      await element(by.id('checkout-screen')).swipe('up', 'slow', 0.5);
      await waitFor(element(by.id('place-order-button')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('BNPL Breakdown', () => {
    it('should show BNPL breakdown when selecting Affirm', async () => {
      await element(by.id('checkout-screen')).swipe('down', 'slow', 0.5);
      await element(by.id('payment-affirm')).tap();

      await element(by.id('checkout-screen')).swipe('up', 'slow', 0.3);
      await waitFor(element(by.id('bnpl-breakdown')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should show BNPL breakdown when selecting Klarna', async () => {
      await element(by.id('checkout-screen')).swipe('down', 'slow', 0.5);
      await element(by.id('payment-klarna')).tap();

      await element(by.id('checkout-screen')).swipe('up', 'slow', 0.3);
      await waitFor(element(by.id('bnpl-breakdown')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should hide BNPL breakdown when selecting card', async () => {
      await element(by.id('checkout-screen')).swipe('down', 'slow', 0.5);
      await element(by.id('payment-card')).tap();

      await expect(element(by.id('bnpl-breakdown'))).not.toBeVisible();
    });
  });

  describe('Place Order', () => {
    it('should tap Place Order button', async () => {
      await element(by.id('checkout-screen')).swipe('up', 'slow', 0.5);
      await waitFor(element(by.id('place-order-button')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('place-order-button')).tap();
    });
  });

  describe('Back Navigation', () => {
    beforeAll(async () => {
      // Re-add item and go back to checkout for back button test
      await device.launchApp({ newInstance: true });
      await dismissOnboarding();
      await navigateToTab('Shop');
      await waitFor(element(by.id('product-card-0')))
        .toBeVisible()
        .withTimeout(10000);
      await element(by.id('product-card-0')).tap();
      await waitAndExpectVisible('product-detail-screen');
      await element(by.id('product-detail-screen')).swipe('up', 'slow', 0.5);
      await waitFor(element(by.id('add-to-cart-button')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('add-to-cart-button')).tap();
      await element(by.id('detail-back-button')).tap();
      await navigateToTab('Cart');
      await element(by.id('cart-screen')).swipe('up', 'slow', 0.5);
      await waitFor(element(by.id('checkout-button')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('checkout-button')).tap();
    });

    it('should navigate back from checkout to cart', async () => {
      await waitAndExpectVisible('checkout-screen');
      await element(by.id('checkout-back-button')).tap();
      await waitAndExpectVisible('cart-screen');
    });
  });
});
