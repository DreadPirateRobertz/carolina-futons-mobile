import { device, element, by, waitFor } from 'detox';
import { dismissOnboarding, navigateToTab, waitAndExpectVisible } from './utils';

const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || 'screenshots';

/**
 * Capture a named screenshot via Detox's device.takeScreenshot().
 * Files land in the artifacts directory configured by the Detox CLI.
 */
async function capture(name: string) {
  await new Promise((r) => setTimeout(r, 500)); // brief settle
  await device.takeScreenshot(name);
}

describe('App Store Screenshots', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await dismissOnboarding();
  });

  it('01 — Home screen', async () => {
    await waitAndExpectVisible('home-screen');
    await capture('01-home');
  });

  it('02 — Shop / product listing', async () => {
    await navigateToTab('Shop');
    await waitAndExpectVisible('shop-screen');
    await waitFor(element(by.id('product-card-0')))
      .toBeVisible()
      .withTimeout(10000);
    await capture('02-shop');
  });

  it('03 — Product detail (gallery + fabric selector)', async () => {
    await element(by.id('product-card-0')).tap();
    await waitAndExpectVisible('product-detail-screen');
    await waitFor(element(by.id('gallery-list')))
      .toBeVisible()
      .withTimeout(10000);
    await capture('03-product-detail');
  });

  it('04 — Product detail with fabric swatch selected', async () => {
    await element(by.id('fabric-swatch-slate-gray')).tap();
    await waitFor(element(by.id('selected-fabric-name')))
      .toBeVisible()
      .withTimeout(5000);
    await capture('04-fabric-selector');
  });

  it('05 — Product detail — dimensions & reviews', async () => {
    await element(by.id('product-detail-screen')).swipe('up', 'slow', 0.5);
    await waitFor(element(by.id('dimensions-card')))
      .toBeVisible()
      .withTimeout(5000);
    await capture('05-dimensions-reviews');
  });

  it('06 — AR preview button visible', async () => {
    // Scroll back up so AR button is in view
    await element(by.id('product-detail-screen')).swipe('down', 'slow', 0.3);
    await waitFor(element(by.id('detail-ar-button')))
      .toExist()
      .withTimeout(5000);
    await capture('06-ar-preview');
  });

  it('07 — Cart with items', async () => {
    // Add current product to cart
    await element(by.id('product-detail-screen')).swipe('up', 'slow', 0.5);
    await waitFor(element(by.id('add-to-cart-button')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('add-to-cart-button')).tap();
    await element(by.id('detail-back-button')).tap();

    // Add a second product for a richer cart screenshot
    await waitFor(element(by.id('product-card-1')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('product-card-1')).tap();
    await waitAndExpectVisible('product-detail-screen');
    await element(by.id('product-detail-screen')).swipe('up', 'slow', 0.5);
    await waitFor(element(by.id('add-to-cart-button')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('add-to-cart-button')).tap();
    await element(by.id('detail-back-button')).tap();

    await navigateToTab('Cart');
    await waitAndExpectVisible('cart-screen');
    await waitFor(element(by.id('cart-header')))
      .toBeVisible()
      .withTimeout(5000);
    await capture('07-cart');
  });

  it('08 — Cart order summary', async () => {
    await element(by.id('cart-screen')).swipe('up', 'slow', 0.3);
    await waitFor(element(by.id('order-summary')))
      .toBeVisible()
      .withTimeout(5000);
    await capture('08-order-summary');
  });

  it('09 — Account screen', async () => {
    await navigateToTab('Account');
    await waitAndExpectVisible('account-screen');
    await capture('09-account');
  });
});
