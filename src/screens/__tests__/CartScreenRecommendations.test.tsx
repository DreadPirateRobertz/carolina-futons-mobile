/**
 * @module CartScreenRecommendations.test
 *
 * TDD tests — hq-bzb.
 * Tests the "Recommended for You" section added to CartScreen.
 *
 * Covered:
 *   - Skeleton shown while loading recommendations
 *   - Carousel rendered when recommendations available
 *   - Skeleton hidden after load
 *   - Section hidden when recommendations are empty
 *   - Section hidden when cart is empty
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { CartScreen } from '../CartScreen';
import { CartProvider, useCart } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

// ── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockSwipeable = React.forwardRef(
    ({ children, renderRightActions, testID, onSwipeableOpen }: any, _ref: any) => (
      <View
        testID={testID}
        onSwipeableOpen={() => onSwipeableOpen?.('right', { close: jest.fn() })}
      >
        {renderRightActions
          ? renderRightActions({ value: 1 }, { value: -100 }, { close: jest.fn() })
          : null}
        {children}
      </View>
    ),
  );
  MockSwipeable.displayName = 'MockSwipeable';
  return { __esModule: true, default: MockSwipeable };
});

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false }),
  AuthProvider: ({ children }: any) => children,
  AuthContext: { _currentValue: null },
}));

jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => ({
    points: 0,
    tier: 'bronze',
    nextTier: 'silver',
    pointsToNext: 500,
    progress: 0,
    loading: false,
    error: null,
    refreshPoints: jest.fn(),
  }),
}));

// Stable client object — prevents CartSessionsSync infinite loop (see cartScreen.sync-error.test.tsx).
const mockWixClient = {
  applyCoupon: jest.fn(),
  addToCart: jest.fn().mockResolvedValue(undefined),
  removeFromCart: jest.fn().mockResolvedValue(undefined),
  updateCartItemQuantity: jest.fn().mockResolvedValue(undefined),
  queryData: jest.fn().mockResolvedValue({ items: [] }),
  insertDataItem: jest.fn().mockResolvedValue({ id: 'mock-id', data: {} }),
  upsertDataItem: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

// Mock useBundleSuggestion to prevent async Wix fetches accumulating across tests (cm-b5f).
jest.mock('@/hooks/useBundleSuggestion', () => ({
  useBundleSuggestion: () => ({
    bundle: null,
    bundleProducts: [],
    pricing: null,
    isLoading: false,
    error: null,
    addBundleToCart: jest.fn(),
    isAddingToCart: false,
    addSuccess: false,
  }),
}));

// ── Controlled recommendation mock ────────────────────────────────────────────

const mockProductRecommendations = jest.fn();
jest.mock('@/hooks/useProductRecommendations', () => ({
  useProductRecommendations: () => mockProductRecommendations(),
  clearRecommendationsCache: jest.fn(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const asheville = FUTON_MODELS[0];
const naturalLinen = FABRICS[0];

const mockRec = {
  id: 'prod-blue-ridge-full',
  name: 'Blue Ridge Full',
  slug: 'blue-ridge-full',
  price: 449,
  category: 'futons' as const,
  fabricOptions: ['Slate Gray'],
  images: [],
  rating: 4.0,
  reviewCount: 8,
  description: 'Another futon',
  inStock: true,
  featured: false,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function CartSeeder({
  items,
}: {
  items: { model: typeof asheville; fabric: typeof naturalLinen; qty: number }[];
}) {
  const { addItem } = useCart();
  React.useEffect(() => {
    items.forEach(({ model, fabric, qty }) => addItem(model, fabric, qty));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function renderCartScreen(
  props: Partial<React.ComponentProps<typeof CartScreen>> = {},
  seedItems?: { model: typeof asheville; fabric: typeof naturalLinen; qty: number }[],
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
        <ThemeProvider>
          <CartProvider>
            {seedItems && <CartSeeder items={seedItems} />}
            {children}
          </CartProvider>
        </ThemeProvider>
      </ConnectivityProvider>
    );
  }
  return render(<CartScreen {...props} />, { wrapper: Wrapper });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CartScreen — "Recommended for You" section', () => {
  const seed = [{ model: asheville, fabric: naturalLinen, qty: 1 }];

  describe('loading state', () => {
    beforeEach(() => {
      mockProductRecommendations.mockReturnValue({
        recommendations: [],
        isLoading: true,
        error: null,
      });
    });

    it('shows skeleton while loading recommendations', async () => {
      const { getByTestId } = renderCartScreen({}, seed);
      await waitFor(() => expect(getByTestId('cart-recommendations-skeleton')).toBeTruthy());
    });

    it('does not show carousel while loading', async () => {
      const { queryByTestId } = renderCartScreen({}, seed);
      await waitFor(() => expect(queryByTestId('cart-recommendations-carousel')).toBeNull());
    });
  });

  describe('loaded with recommendations', () => {
    beforeEach(() => {
      mockProductRecommendations.mockReturnValue({
        recommendations: [mockRec],
        isLoading: false,
        error: null,
      });
    });

    it('shows recommendations carousel after load', async () => {
      const { getByTestId } = renderCartScreen({}, seed);
      await waitFor(() => expect(getByTestId('cart-recommendations-carousel')).toBeTruthy());
    });

    it('does not show skeleton after load', async () => {
      const { queryByTestId } = renderCartScreen({}, seed);
      await waitFor(() => expect(queryByTestId('cart-recommendations-skeleton')).toBeNull());
    });
  });

  describe('empty recommendations', () => {
    beforeEach(() => {
      mockProductRecommendations.mockReturnValue({
        recommendations: [],
        isLoading: false,
        error: null,
      });
    });

    it('hides section when no recommendations returned', async () => {
      const { queryByTestId } = renderCartScreen({}, seed);
      await waitFor(() => {
        expect(queryByTestId('cart-recommendations-carousel')).toBeNull();
        expect(queryByTestId('cart-recommendations-skeleton')).toBeNull();
      });
    });
  });

  describe('empty cart', () => {
    beforeEach(() => {
      mockProductRecommendations.mockReturnValue({
        recommendations: [mockRec],
        isLoading: false,
        error: null,
      });
    });

    it('does not show recommendations section when cart is empty', async () => {
      const { queryByTestId } = renderCartScreen();
      await waitFor(() => {
        expect(queryByTestId('cart-recommendations-carousel')).toBeNull();
        expect(queryByTestId('cart-recommendations-skeleton')).toBeNull();
      });
    });
  });
});
