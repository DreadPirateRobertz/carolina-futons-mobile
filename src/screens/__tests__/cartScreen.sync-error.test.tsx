/**
 * TDD tests for CartScreen sync error recovery — cm-vjz
 *
 * When a Wix cart mutation fails (online addToCart rejects), CartScreen must:
 *   1. Roll back the optimistic update (remove item from local cart)
 *   2. Show a sync error banner (testID: cart-sync-error)
 *   3. Offer retry (testID: cart-sync-retry) and dismiss (testID: cart-sync-dismiss)
 */
import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { CartScreen } from '../CartScreen';
import { CartProvider, useCart } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

const mockUseLoyalty = jest.fn();
jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockUseLoyalty(),
}));

const loyaltyBase = {
  points: 0,
  tier: 'bronze' as const,
  nextTier: 'silver' as const,
  pointsToNext: 500,
  progress: 0,
  loading: false,
  error: null,
  refreshPoints: jest.fn(),
};

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockSwipeable = React.forwardRef(
    ({ children, onSwipeableOpen, testID, renderRightActions }: any, _ref: any) => (
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
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  AuthContext: { _currentValue: null },
}));

const mockAddToCart = jest.fn();
const mockSyncNow = jest.fn().mockResolvedValue(undefined);

// Stable client object — avoids infinite useEffect loop from CartSessionsSync
// (useCartSessions.saveCart has wixClient in its deps; a new object each render
// causes saveCart to be recreated → effect fires → saveCart called → setSaveError
// → re-render → new wixClient → ... infinite loop).
const mockWixClient = {
  applyCoupon: jest.fn(),
  addToCart: mockAddToCart,
  removeFromCart: jest.fn().mockResolvedValue(undefined),
  updateCartItemQuantity: jest.fn().mockResolvedValue(undefined),
  queryData: jest.fn().mockResolvedValue({ items: [] }),
  insertDataItem: jest.fn().mockResolvedValue({ id: 'mock-id', data: {} }),
  upsertDataItem: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

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

jest.mock('@/hooks/useProductRecommendations', () => ({
  useProductRecommendations: () => ({ recommendations: [], isLoading: false, error: null }),
  clearRecommendationsCache: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/hooks/useGamificationEvents', () => ({
  useGamificationEvents: () => ({
    addToCart: jest.fn().mockResolvedValue({ success: true }),
    submitReview: jest.fn(),
    referralShared: jest.fn(),
    arUsed: jest.fn(),
    wishlistAdd: jest.fn(),
    orderPlaced: jest.fn(),
    styleQuizComplete: jest.fn(),
  }),
}));

const asheville = FUTON_MODELS[0];
const naturalLinen = FABRICS[0];

function renderCartScreen(
  props: Partial<React.ComponentProps<typeof CartScreen>> = {},
  seedItems?: { model: typeof asheville; fabric: typeof naturalLinen; qty: number }[],
) {
  function CartSeeder({ items }: { items: NonNullable<typeof seedItems> }) {
    const { addItem } = useCart();
    React.useEffect(() => {
      items.forEach(({ model, fabric, qty }) => addItem(model, fabric, qty));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
  }

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

describe('CartScreen — sync error recovery (cm-vjz)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLoyalty.mockReturnValue(loyaltyBase);
    mockAddToCart.mockResolvedValue(undefined);
  });

  describe('optimistic rollback on addToCart failure', () => {
    it('removes item from cart when online addToCart rejects', async () => {
      mockAddToCart.mockRejectedValue(new Error('Wix API unavailable'));

      const { queryByTestId } = renderCartScreen({}, [
        { model: asheville, fabric: naturalLinen, qty: 1 },
      ]);

      // Wait for rollback — item disappears after rejection propagates
      await waitFor(() => {
        expect(queryByTestId(`cart-item-${asheville.id}:${naturalLinen.id}`)).toBeNull();
      });
    });

    it('shows cart-sync-error banner after addToCart failure', async () => {
      mockAddToCart.mockRejectedValue(new Error('Wix API unavailable'));

      const { findByTestId } = renderCartScreen({}, [
        { model: asheville, fabric: naturalLinen, qty: 1 },
      ]);

      expect(await findByTestId('cart-sync-error')).toBeTruthy();
    });

    it('does not show cart-sync-error when addToCart succeeds', async () => {
      mockAddToCart.mockResolvedValue(undefined);

      const { queryByTestId, findByTestId } = renderCartScreen({}, [
        { model: asheville, fabric: naturalLinen, qty: 1 },
      ]);

      // Wait for cart item to appear — confirms addToCart resolved without error.
      // Uses waitFor-based findByTestId instead of act() to avoid blocking on
      // unresolved native SecureStore promises from CartSessionsSync.
      await findByTestId(`cart-item-${asheville.id}:${naturalLinen.id}`);
      expect(queryByTestId('cart-sync-error')).toBeNull();
    });
  });

  describe('sync error banner actions', () => {
    it('clears sync error banner when dismiss is pressed', async () => {
      mockAddToCart.mockRejectedValue(new Error('Wix API unavailable'));

      const { findByTestId, queryByTestId } = renderCartScreen({}, [
        { model: asheville, fabric: naturalLinen, qty: 1 },
      ]);

      const banner = await findByTestId('cart-sync-error');
      expect(banner).toBeTruthy();

      fireEvent.press(await findByTestId('cart-sync-dismiss'));

      await waitFor(() => {
        expect(queryByTestId('cart-sync-error')).toBeNull();
      });
    });
  });
});
