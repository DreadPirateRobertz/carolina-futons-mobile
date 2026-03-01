import { device, element, by, expect, waitFor } from 'detox';
import { dismissOnboarding, navigateToTab, waitAndExpectVisible } from './utils';

describe('Browse Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await dismissOnboarding();
  });

  describe('Home Screen', () => {
    it('should display the home screen with welcome message', async () => {
      await waitAndExpectVisible('home-screen');
      await expect(element(by.text('Welcome to Carolina Futons'))).toBeVisible();
      await expect(
        element(by.text('Handcrafted comfort from the Blue Ridge Mountains')),
      ).toBeVisible();
    });

    it('should display AR and Shop CTAs', async () => {
      await expect(element(by.id('home-ar-button'))).toBeVisible();
      await expect(element(by.id('home-shop-button'))).toBeVisible();
    });

    it('should navigate to Shop tab when tapping Browse Products', async () => {
      await element(by.id('home-shop-button')).tap();
      await waitAndExpectVisible('shop-screen');
    });
  });

  describe('Shop Screen — Product List', () => {
    beforeAll(async () => {
      await navigateToTab('Shop');
    });

    it('should display the shop screen with product list', async () => {
      await waitAndExpectVisible('shop-screen');
      await waitAndExpectVisible('product-list');
    });

    it('should display product cards', async () => {
      // At least the first product should be visible
      await waitFor(element(by.id('product-card-0')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should display category filter chips', async () => {
      await expect(element(by.id('category-filter'))).toBeVisible();
    });

    it('should filter products when selecting a category', async () => {
      // Tap a category chip — "Futons" should be one of them
      await element(by.id('category-chip-futons')).tap();

      // Product list should still be visible (filtered)
      await expect(element(by.id('product-list'))).toBeVisible();

      // Tap "All" to reset
      await element(by.id('category-chip-all')).tap();
    });

    it('should navigate to product detail when tapping a product', async () => {
      await element(by.id('product-card-0')).tap();
      await waitAndExpectVisible('product-detail-screen');
    });
  });

  describe('Product Detail Screen', () => {
    it('should display product name and price', async () => {
      await expect(element(by.id('product-name'))).toBeVisible();
      await expect(element(by.id('total-price'))).toBeVisible();
    });

    it('should display gallery with pagination', async () => {
      await expect(element(by.id('gallery-list'))).toBeVisible();
      await expect(element(by.id('gallery-pagination'))).toBeVisible();
    });

    it('should allow swiping through gallery slides', async () => {
      await expect(element(by.id('gallery-slide-0'))).toBeVisible();
      await element(by.id('gallery-list')).swipe('left');
    });

    it('should display fabric selector', async () => {
      await expect(element(by.id('fabric-selector'))).toBeVisible();
    });

    it('should change fabric when tapping a swatch', async () => {
      await element(by.id('fabric-swatch-slate-gray')).tap();
      await expect(element(by.id('selected-fabric-name'))).toBeVisible();
    });

    it('should display dimensions card', async () => {
      await element(by.id('product-detail-screen')).swipe('up', 'slow', 0.5);
      await waitFor(element(by.id('dimensions-card')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display reviews section', async () => {
      await element(by.id('product-detail-screen')).swipe('up', 'slow', 0.5);
      await waitFor(element(by.id('reviews-section')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display AR button', async () => {
      await expect(element(by.id('detail-ar-button'))).toExist();
    });

    it('should display quantity selector', async () => {
      await element(by.id('product-detail-screen')).swipe('up', 'slow', 0.5);
      await waitFor(element(by.id('quantity-selector')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should increment quantity', async () => {
      await element(by.id('quantity-increment')).tap();
      await expect(element(by.id('quantity-value'))).toHaveText('2');
    });

    it('should decrement quantity', async () => {
      await element(by.id('quantity-decrement')).tap();
      await expect(element(by.id('quantity-value'))).toHaveText('1');
    });

    it('should add item to cart', async () => {
      await element(by.id('product-detail-screen')).swipe('up', 'slow', 0.5);
      await waitFor(element(by.id('add-to-cart-button')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('add-to-cart-button')).tap();
    });

    it('should navigate back to shop', async () => {
      await element(by.id('detail-back-button')).tap();
      await waitAndExpectVisible('shop-screen');
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between all tabs', async () => {
      await navigateToTab('Home');
      await waitAndExpectVisible('home-screen');

      await navigateToTab('Shop');
      await waitAndExpectVisible('shop-screen');

      await navigateToTab('Cart');
      await waitAndExpectVisible('cart-screen');

      await navigateToTab('Account');
      await waitAndExpectVisible('account-screen');
    });
  });
});
