/**
 * WishlistScreen edge-case tests — cm-49b
 *
 * Covers gaps not addressed in wishlistScreen.test.tsx, wishlistScreen.deeper.test.tsx,
 * and wishlistScreenSkeleton.test.tsx:
 *  1. Haptics — notificationAsync / impactAsync fired on native (iOS/Android), suppressed on web
 *  2. Sort state transitions — toggling between sort modes
 *  3. Accessibility hints on Share / Add All / Clear All buttons
 *  4. Custom testID prop on screen container
 *  5. Refresh control — testID and initial refreshing state
 *  6. Share analytics fires before Share.share rejection
 *  7. Clear All alert body text and button labels
 *  8. Price drop badge — edge values (savedPrice zero, minimal, large drop)
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Share, Platform } from 'react-native';
import { WishlistScreen } from '../WishlistScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider, type WishlistItem } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';
import { PRODUCTS } from '@/data/products';

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockSwipeable = React.forwardRef(
    ({ children, testID, renderRightActions }: any, _ref: any) => (
      <View testID={testID}>
        {renderRightActions
          ? renderRightActions({ value: 1 }, { value: -100 }, { close: jest.fn() })
          : null}
        {children}
      </View>
    ),
  );
  return { __esModule: true, default: MockSwipeable };
});

jest.mock('@/components/ProductCard', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ProductCard: ({ testID, onPress, onLongPress }: any) =>
      React.createElement(View, { testID, onPress, onLongPress }),
  };
});

jest.mock('@/hooks/useSyncedWishlist', () => ({
  useSyncedWishlist: (_opts: unknown) => {
    const { useWishlist } = require('@/hooks/useWishlist');
    return { ...useWishlist(), pendingCount: 0, isSyncing: false, syncNow: jest.fn() };
  },
}));

const mockAddItem = jest.fn();

jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    items: [],
    itemCount: 0,
    subtotal: 0,
    addItem: mockAddItem,
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    syncing: false,
  }),
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/services/analytics', () => ({
  events: {
    removeFromWishlist: jest.fn(),
    shareWishlist: jest.fn(),
    addToCart: jest.fn(),
    addToWishlist: jest.fn(),
    viewProduct: jest.fn(),
    sortProducts: jest.fn(),
    filterCategory: jest.fn(),
    search: jest.fn(),
  },
}));

const mockHapticsImpact = jest.fn();
const mockHapticsNotification = jest.fn();

jest.mock('expo-haptics', () => ({
  impactAsync: (...args: unknown[]) => mockHapticsImpact(...args),
  notificationAsync: (...args: unknown[]) => mockHapticsNotification(...args),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Warning: 'warning', Success: 'success', Error: 'error' },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const product1 = PRODUCTS[0]; // prod-asheville-full   $349 (futon)
const product2 = PRODUCTS[1]; // prod-blue-ridge-queen $449 (futon)
const product3 = PRODUCTS[2]; // prod-pisgah-twin      $279 (futon)

function makeItems(...products: typeof PRODUCTS): WishlistItem[] {
  return products.map((p, i) => ({
    productId: p.id,
    addedAt: Date.now() + i * 1000,
    savedPrice: p.price,
  }));
}

function renderScreen(
  opts: {
    items?: WishlistItem[];
    onProductPress?: jest.Mock;
    onBrowse?: jest.Mock;
    testID?: string;
  } = {},
) {
  const onProductPress = opts.onProductPress ?? jest.fn();
  const onBrowse = opts.onBrowse ?? jest.fn();
  return {
    ...render(
      <ThemeProvider>
        <WishlistProvider initialItems={opts.items ?? []}>
          <CompareProvider>
            <WishlistScreen
              onProductPress={onProductPress}
              onBrowse={onBrowse}
              testID={opts.testID}
            />
          </CompareProvider>
        </WishlistProvider>
      </ThemeProvider>,
    ),
    onProductPress,
    onBrowse,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── 1. Haptics — native vs web ─────────────────────────────────────────────────

describe('haptics on native (iOS / Android) vs web', () => {
  it('swipe Remove fires notificationAsync(Warning) on iOS', () => {
    const origOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
    const { getByTestId } = renderScreen({ items: makeItems(product1) });
    fireEvent.press(getByTestId(`swipe-remove-${product1.id}`));
    expect(mockHapticsNotification).toHaveBeenCalledWith('warning');
    Object.defineProperty(Platform, 'OS', { value: origOS, writable: true, configurable: true });
  });

  it('swipe Remove fires notificationAsync(Warning) on Android', () => {
    const origOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true, configurable: true });
    const { getByTestId } = renderScreen({ items: makeItems(product1) });
    fireEvent.press(getByTestId(`swipe-remove-${product1.id}`));
    expect(mockHapticsNotification).toHaveBeenCalledWith('warning');
    Object.defineProperty(Platform, 'OS', { value: origOS, writable: true, configurable: true });
  });

  it('swipe Remove does NOT fire haptics on web', () => {
    const origOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', writable: true, configurable: true });
    const { getByTestId } = renderScreen({ items: makeItems(product1) });
    fireEvent.press(getByTestId(`swipe-remove-${product1.id}`));
    expect(mockHapticsNotification).not.toHaveBeenCalled();
    Object.defineProperty(Platform, 'OS', { value: origOS, writable: true, configurable: true });
  });

  it('long-press confirm Remove fires notificationAsync(Warning) on iOS', () => {
    const origOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByTestId } = renderScreen({ items: makeItems(product1) });
    fireEvent(getByTestId(`wishlist-item-${product1.id}`), 'longPress');
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    act(() => {
      buttons.find((b) => b.text === 'Remove')?.onPress?.();
    });
    expect(mockHapticsNotification).toHaveBeenCalledWith('warning');
    Object.defineProperty(Platform, 'OS', { value: origOS, writable: true, configurable: true });
  });

  it('share button fires impactAsync(Light) on iOS', () => {
    const origOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
    const { getByTestId } = renderScreen({ items: makeItems(product1) });
    fireEvent.press(getByTestId('wishlist-share'));
    expect(mockHapticsImpact).toHaveBeenCalledWith('light');
    Object.defineProperty(Platform, 'OS', { value: origOS, writable: true, configurable: true });
  });

  it('share button does NOT fire haptics on web', () => {
    const origOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', writable: true, configurable: true });
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
    const { getByTestId } = renderScreen({ items: makeItems(product1) });
    fireEvent.press(getByTestId('wishlist-share'));
    expect(mockHapticsImpact).not.toHaveBeenCalled();
    Object.defineProperty(Platform, 'OS', { value: origOS, writable: true, configurable: true });
  });

  it('Clear All button fires notificationAsync(Warning) on iOS', () => {
    const origOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
    jest.spyOn(Alert, 'alert');
    const { getByTestId } = renderScreen({ items: makeItems(product1) });
    fireEvent.press(getByTestId('wishlist-clear'));
    expect(mockHapticsNotification).toHaveBeenCalledWith('warning');
    Object.defineProperty(Platform, 'OS', { value: origOS, writable: true, configurable: true });
  });

  it('Clear All button does NOT fire haptics on web', () => {
    const origOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', writable: true, configurable: true });
    jest.spyOn(Alert, 'alert');
    const { getByTestId } = renderScreen({ items: makeItems(product1) });
    fireEvent.press(getByTestId('wishlist-clear'));
    expect(mockHapticsNotification).not.toHaveBeenCalled();
    Object.defineProperty(Platform, 'OS', { value: origOS, writable: true, configurable: true });
  });

  it('Add All to Cart fires notificationAsync(Success) on iOS', () => {
    const origOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
    const { getByTestId } = renderScreen({ items: makeItems(product1, product2) });
    fireEvent.press(getByTestId('wishlist-add-all'));
    expect(mockHapticsNotification).toHaveBeenCalledWith('success');
    Object.defineProperty(Platform, 'OS', { value: origOS, writable: true, configurable: true });
  });

  it('Add All to Cart does NOT fire haptics on web', () => {
    const origOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', writable: true, configurable: true });
    const { getByTestId } = renderScreen({ items: makeItems(product1, product2) });
    fireEvent.press(getByTestId('wishlist-add-all'));
    expect(mockHapticsNotification).not.toHaveBeenCalled();
    Object.defineProperty(Platform, 'OS', { value: origOS, writable: true, configurable: true });
  });

  it('swipe Move to Cart fires notificationAsync(Success) for futon on iOS', () => {
    const origOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
    const { getByTestId } = renderScreen({ items: makeItems(product1) });
    fireEvent.press(getByTestId(`swipe-move-to-cart-${product1.id}`));
    expect(mockHapticsNotification).toHaveBeenCalledWith('success');
    Object.defineProperty(Platform, 'OS', { value: origOS, writable: true, configurable: true });
  });

  it('swipe Move to Cart does NOT fire haptics for non-futon on iOS (navigates to PDP)', () => {
    const origOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
    const murphyProduct = PRODUCTS.find((p) => p.category === 'murphy-beds') ?? product3;
    const { getByTestId } = renderScreen({ items: makeItems(murphyProduct) });
    fireEvent.press(getByTestId(`swipe-move-to-cart-${murphyProduct.id}`));
    expect(mockHapticsNotification).not.toHaveBeenCalled();
    Object.defineProperty(Platform, 'OS', { value: origOS, writable: true, configurable: true });
  });
});

// ── 2. Sort state transitions ─────────────────────────────────────────────────

describe('sort state transitions', () => {
  it('pressing the default date sort button again does not throw', () => {
    const { getByTestId } = renderScreen({ items: makeItems(product1, product2) });
    expect(() => fireEvent.press(getByTestId('wishlist-sort-date'))).not.toThrow();
  });

  it('switching price-asc → date keeps all items visible', () => {
    const { getByTestId, queryByTestId } = renderScreen({
      items: makeItems(product1, product2, product3),
    });
    fireEvent.press(getByTestId('wishlist-sort-price-asc'));
    fireEvent.press(getByTestId('wishlist-sort-date'));
    expect(queryByTestId(`wishlist-item-${product1.id}`)).toBeTruthy();
    expect(queryByTestId(`wishlist-item-${product2.id}`)).toBeTruthy();
    expect(queryByTestId(`wishlist-item-${product3.id}`)).toBeTruthy();
  });

  it('switching price-desc → price-asc keeps all items visible', () => {
    const { getByTestId, queryByTestId } = renderScreen({
      items: makeItems(product1, product2, product3),
    });
    fireEvent.press(getByTestId('wishlist-sort-price-desc'));
    fireEvent.press(getByTestId('wishlist-sort-price-asc'));
    expect(queryByTestId(`wishlist-item-${product1.id}`)).toBeTruthy();
    expect(queryByTestId(`wishlist-item-${product2.id}`)).toBeTruthy();
    expect(queryByTestId(`wishlist-item-${product3.id}`)).toBeTruthy();
  });

  it('cycling through all three sort modes preserves all items', () => {
    const { getByTestId, queryByTestId } = renderScreen({
      items: makeItems(product1, product2, product3),
    });
    fireEvent.press(getByTestId('wishlist-sort-price-asc'));
    fireEvent.press(getByTestId('wishlist-sort-price-desc'));
    fireEvent.press(getByTestId('wishlist-sort-date'));
    expect(queryByTestId(`wishlist-item-${product1.id}`)).toBeTruthy();
    expect(queryByTestId(`wishlist-item-${product2.id}`)).toBeTruthy();
    expect(queryByTestId(`wishlist-item-${product3.id}`)).toBeTruthy();
  });
});

// ── 3. Accessibility hints ────────────────────────────────────────────────────

describe('accessibility hints on action buttons', () => {
  it('share button has correct accessibilityHint', () => {
    const { getByTestId } = renderScreen({ items: makeItems(product1) });
    expect(getByTestId('wishlist-share').props.accessibilityHint).toBe(
      'Opens the share sheet with your wishlist items',
    );
  });

  it('Add All button has correct accessibilityHint', () => {
    const { getByTestId } = renderScreen({ items: makeItems(product1, product2) });
    expect(getByTestId('wishlist-add-all').props.accessibilityHint).toBe(
      'Adds all wishlist items to your cart',
    );
  });

  it('Clear All button has correct accessibilityHint', () => {
    const { getByTestId } = renderScreen({ items: makeItems(product1) });
    expect(getByTestId('wishlist-clear').props.accessibilityHint).toBe(
      'Removes all products from your wishlist',
    );
  });
});

// ── 4. Custom testID prop ─────────────────────────────────────────────────────

describe('custom testID prop on container', () => {
  it('renders container with provided testID', () => {
    const { getByTestId } = renderScreen({ testID: 'my-wishlist' });
    expect(getByTestId('my-wishlist')).toBeTruthy();
  });

  it('falls back to wishlist-screen when testID not provided', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('wishlist-screen')).toBeTruthy();
  });
});

// ── 5. Refresh control ────────────────────────────────────────────────────────

describe('refresh control details', () => {
  it('refreshControl has testID wishlist-refresh-control', () => {
    const { getByTestId } = renderScreen({ items: makeItems(product1) });
    const flatList = getByTestId('wishlist-list');
    expect(flatList.props.refreshControl.props.testID).toBe('wishlist-refresh-control');
  });

  it('refreshControl starts in non-refreshing state', () => {
    const { getByTestId } = renderScreen({ items: makeItems(product1) });
    const flatList = getByTestId('wishlist-list');
    expect(flatList.props.refreshControl.props.refreshing).toBe(false);
  });

  it('refreshControl onRefresh is wired on empty wishlist', () => {
    const { getByTestId } = renderScreen();
    const flatList = getByTestId('wishlist-list');
    expect(typeof flatList.props.refreshControl.props.onRefresh).toBe('function');
  });
});

// ── 6. Share analytics fires before Share.share settles ─────────────────────

describe('share analytics reliability', () => {
  it('shareWishlist fires even when Share.share rejects (analytics not inside try/catch)', async () => {
    const { events } = require('@/services/analytics');
    jest.spyOn(Share, 'share').mockRejectedValueOnce(new Error('cancelled'));
    const { getByTestId } = renderScreen({ items: makeItems(product1) });
    fireEvent.press(getByTestId('wishlist-share'));
    await waitFor(() => expect(events.shareWishlist).toHaveBeenCalled());
    expect(events.shareWishlist).toHaveBeenCalledWith(1);
  });

  it('shareWishlist fires with correct count for multiple items even on rejection', async () => {
    const { events } = require('@/services/analytics');
    jest.spyOn(Share, 'share').mockRejectedValueOnce(new Error('cancelled'));
    const { getByTestId } = renderScreen({ items: makeItems(product1, product2, product3) });
    fireEvent.press(getByTestId('wishlist-share'));
    await waitFor(() => expect(events.shareWishlist).toHaveBeenCalled());
    expect(events.shareWishlist).toHaveBeenCalledWith(3);
  });
});

// ── 7. Clear All alert message text ──────────────────────────────────────────

describe('clear all alert text', () => {
  it('alert body asks to remove all items from wishlist', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByTestId } = renderScreen({ items: makeItems(product1, product2) });
    fireEvent.press(getByTestId('wishlist-clear'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Clear Wishlist',
      'Remove all items from your wishlist?',
      expect.any(Array),
    );
  });

  it('clear alert has exactly two buttons: Cancel and Clear All', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByTestId } = renderScreen({ items: makeItems(product1) });
    fireEvent.press(getByTestId('wishlist-clear'));
    const buttons = alertSpy.mock.calls[0][2] as { text: string }[];
    expect(buttons).toHaveLength(2);
    const labels = buttons.map((b) => b.text);
    expect(labels).toContain('Cancel');
    expect(labels).toContain('Clear All');
  });
});

// ── 8. Price drop badge — edge values ─────────────────────────────────────────

describe('price drop badge — edge values', () => {
  it('no badge when savedPrice is 0 (priceDrop is deeply negative)', () => {
    const { queryByText } = renderScreen({
      items: [{ productId: product1.id, addedAt: Date.now(), savedPrice: 0 }],
    });
    expect(queryByText(/off!/)).toBeNull();
  });

  it('badge shown for minimal positive drop ($0.01)', () => {
    const { getByText } = renderScreen({
      items: [{ productId: product1.id, addedAt: Date.now(), savedPrice: product1.price + 0.01 }],
    });
    expect(getByText('$0.01 off!')).toBeTruthy();
  });

  it('badge shows correctly for large price drop', () => {
    const { getByText } = renderScreen({
      items: [{ productId: product1.id, addedAt: Date.now(), savedPrice: product1.price + 200 }],
    });
    expect(getByText('$200.00 off!')).toBeTruthy();
  });
});
