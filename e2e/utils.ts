import { device, element, by, expect, waitFor } from 'detox';

/**
 * Dismiss onboarding by tapping through slides or skipping.
 * The app shows onboarding on first launch unless AsyncStorage has the flag.
 */
export async function dismissOnboarding() {
  try {
    // Try the skip button first (fastest path)
    await waitFor(element(by.id('onboarding-skip-button')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('onboarding-skip-button')).tap();
  } catch {
    // Onboarding may not appear if already completed — that's fine
  }

  // Wait for the home screen to confirm we're past onboarding
  await waitFor(element(by.id('home-screen')))
    .toBeVisible()
    .withTimeout(10000);
}

/**
 * Navigate to a specific tab in the bottom tab navigator.
 */
export async function navigateToTab(tab: 'Home' | 'Shop' | 'Cart' | 'Account') {
  await element(by.text(tab)).tap();
}

/**
 * Add a product to the cart from the shop screen.
 * Taps on the first product, then taps "Add to Cart" on the detail screen.
 */
export async function addProductToCart() {
  await navigateToTab('Shop');

  await waitFor(element(by.id('product-list')))
    .toBeVisible()
    .withTimeout(10000);

  // Tap the first product card
  await element(by.id('product-card-0')).tap();

  // Wait for product detail to load
  await waitFor(element(by.id('product-detail-screen')))
    .toBeVisible()
    .withTimeout(10000);

  // Tap add to cart
  await element(by.id('add-to-cart-button')).tap();
}

/**
 * Wait for an element with a timeout, then assert visibility.
 */
export async function waitAndExpectVisible(testID: string, timeout = 10000) {
  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .withTimeout(timeout);
  await expect(element(by.id(testID))).toBeVisible();
}

/**
 * Scroll down within a scrollable element to find a child element.
 */
export async function scrollToElement(
  scrollableTestID: string,
  targetTestID: string,
  direction: 'down' | 'up' = 'down',
  pixels = 200,
) {
  await waitFor(element(by.id(targetTestID)))
    .toBeVisible()
    .whileElement(by.id(scrollableTestID))
    .scroll(pixels, direction);
}

/**
 * Relaunch the app with a clean state.
 */
export async function relaunchApp() {
  await device.launchApp({ newInstance: true });
}
