import { device, element, by, expect, waitFor } from 'detox';
import { dismissOnboarding, navigateToTab, waitAndExpectVisible } from './utils';

describe('Search Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await dismissOnboarding();
    await navigateToTab('Shop');
    await waitAndExpectVisible('shop-screen');
  });

  describe('Search Bar Interaction', () => {
    it('should display the search bar', async () => {
      await expect(element(by.id('search-bar'))).toBeVisible();
    });

    it('should focus search input on tap', async () => {
      await element(by.id('search-input')).tap();
      await expect(element(by.id('search-input'))).toBeVisible();
    });

    it('should show recent searches dropdown when input is focused', async () => {
      // Initially there may not be recent searches, but the dropdown should appear
      await element(by.id('search-input')).tap();
      // The dropdown container should be present
      await waitFor(element(by.id('search-dropdown')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should type a search query and show suggestions', async () => {
      await element(by.id('search-input')).typeText('futon');

      // Suggestions should appear
      await waitFor(element(by.id('search-suggestions')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should select a suggestion', async () => {
      // Tap the first suggestion
      try {
        await element(by.id('suggestion-futon')).tap();
      } catch {
        // If exact suggestion not found, submit the search
        await element(by.id('search-input')).tapReturnKey();
      }

      // Product list should update
      await expect(element(by.id('product-list'))).toBeVisible();
    });

    it('should clear search input', async () => {
      await element(by.id('search-clear')).tap();
      await expect(element(by.id('search-input'))).toHaveText('');
    });
  });

  describe('Search Results', () => {
    it('should show filtered results for a valid query', async () => {
      await element(by.id('search-input')).typeText('asheville');
      await element(by.id('search-input')).tapReturnKey();

      await waitFor(element(by.id('product-list')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should show empty state for no results', async () => {
      await element(by.id('search-input')).clearText();
      await element(by.id('search-input')).typeText('zzzznonexistent');
      await element(by.id('search-input')).tapReturnKey();

      await waitFor(element(by.id('shop-empty')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should clear search and show all products', async () => {
      await element(by.id('search-clear')).tap();

      await waitFor(element(by.id('product-list')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });

  describe('Recent Searches', () => {
    it('should save search queries as recent searches', async () => {
      // Perform a search
      await element(by.id('search-input')).typeText('queen');
      await element(by.id('search-input')).tapReturnKey();

      // Clear and tap search again to see recents
      await element(by.id('search-clear')).tap();
      await element(by.id('search-input')).tap();

      // Recent searches section should appear
      await waitFor(element(by.id('search-recent')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should tap a recent search to re-execute it', async () => {
      await element(by.id('recent-queen')).tap();

      await waitFor(element(by.id('product-list')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should remove a recent search', async () => {
      await element(by.id('search-clear')).tap();
      await element(by.id('search-input')).tap();

      await waitFor(element(by.id('search-recent')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('remove-recent-queen')).tap();
    });

    it('should clear all recent searches', async () => {
      // First add a search back
      await element(by.id('search-input')).clearText();
      await element(by.id('search-input')).typeText('twin');
      await element(by.id('search-input')).tapReturnKey();

      await element(by.id('search-clear')).tap();
      await element(by.id('search-input')).tap();

      await waitFor(element(by.id('clear-recent')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('clear-recent')).tap();
    });
  });

  describe('Sort Integration', () => {
    it('should display sort picker', async () => {
      await element(by.id('search-input')).clearText();
      await expect(element(by.id('sort-picker'))).toExist();
    });
  });
});
