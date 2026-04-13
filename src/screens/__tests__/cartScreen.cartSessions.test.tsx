/**
 * cm-3ek9: CartScreen × useCartSessions cross-device cart sync
 *
 * Isolated test suite for the useCartSessions integration added to CartScreen.
 * Kept separate from CartScreen.test.tsx which is excluded from CI (OOM).
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { CartScreen } from '../CartScreen';
import { CartProvider, useCart } from '@/hooks/useCart';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockSwipeable = React.forwardRef(({ children, testID }: any, _ref: any) => (
    <View testID={testID}>{children}</View>
  ));
  MockSwipeable.displayName = 'MockSwipeable';
  return { __esModule: true, default: MockSwipeable };
});

const mockUseLoyalty = jest.fn();
jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockUseLoyalty(),
}));

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  AuthContext: { _currentValue: null },
}));

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => ({
    applyCoupon: jest.fn(),
    addToCart: jest.fn().mockResolvedValue(undefined),
    removeFromCart: jest.fn().mockResolvedValue(undefined),
    updateCartItemQuantity: jest.fn().mockResolvedValue(undefined),
    queryData: jest.fn().mockResolvedValue({ items: [] }),
    insertDataItem: jest.fn().mockResolvedValue({ id: 'mock-id', data: {} }),
  }),
}));

// BundleSuggestion imports useBundleSuggestion → @/data/products which causes
// SIGABRT OOM in Jest. Mock the component to prevent the transitive crash.
jest.mock('@/components/BundleSuggestion', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { BundleSuggestion: () => <View testID="mock-bundle-suggestion" /> };
});

const mockSaveCart = jest.fn().mockResolvedValue(undefined);
const mockMergeOnLogin = jest.fn().mockResolvedValue([]);
const mockUseCartSessions = jest.fn();
jest.mock('@/hooks/useCartSessions', () => ({
  useCartSessions: (opts: unknown) => mockUseCartSessions(opts),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const asheville = FUTON_MODELS[0];
const naturalLinen = FABRICS[0];

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

const defaultSessionReturn = {
  items: [],
  loading: false,
  loadError: null,
  saveError: null,
  saveCart: mockSaveCart,
  mergeOnLogin: mockMergeOnLogin,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function CartSeeder({
  model,
  fabric,
  qty,
}: {
  model: typeof asheville;
  fabric: typeof naturalLinen;
  qty: number;
}) {
  const { addItem } = useCart();
  React.useEffect(() => {
    addItem(model, fabric, qty);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function renderCart(
  props: Partial<React.ComponentProps<typeof CartScreen>> = {},
  withItem = false,
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
        <ThemeProvider>
          <CartProvider>
            {withItem && <CartSeeder model={asheville} fabric={naturalLinen} qty={2} />}
            {children}
          </CartProvider>
        </ThemeProvider>
      </ConnectivityProvider>
    );
  }
  return render(<CartScreen {...props} />, { wrapper: Wrapper });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLoyalty.mockReturnValue(loyaltyBase);
  mockUseCartSessions.mockReturnValue(defaultSessionReturn);
});

describe('CartScreen — useCartSessions integration (cm-3ek9)', () => {
  it('calls useCartSessions with null memberId when guest', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
    renderCart();
    await waitFor(() => {
      expect(mockUseCartSessions).toHaveBeenCalledWith(expect.objectContaining({ memberId: null }));
    });
  });

  it('calls useCartSessions with memberId when authenticated', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'member-abc', email: 'test@test.com' },
    });
    renderCart();
    await waitFor(() => {
      expect(mockUseCartSessions).toHaveBeenCalledWith(
        expect.objectContaining({ memberId: 'member-abc' }),
      );
    });
  });

  it('calls saveCart with mapped CartSessionItems when cart has items', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'member-abc' } });
    renderCart({}, true);
    await waitFor(() => {
      expect(mockSaveCart).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            productId: asheville.id,
            variantId: naturalLinen.id,
            quantity: 2,
          }),
        ]),
      );
    });
  });

  it('does not call saveCart when cart is empty', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
    renderCart(); // no seed item
    await waitFor(() => expect(mockUseCartSessions).toHaveBeenCalled());
    expect(mockSaveCart).not.toHaveBeenCalled();
  });

  it('calls mergeOnLogin when user transitions from guest to authenticated', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
    const { rerender } = renderCart({}, true);

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'member-new' },
    });
    rerender(<CartScreen />);

    await waitFor(() => {
      expect(mockMergeOnLogin).toHaveBeenCalledWith('member-new');
    });
  });

  it('does not call mergeOnLogin on initial authenticated mount', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'member-abc' },
    });
    renderCart({}, true);
    await waitFor(() => expect(mockSaveCart).toHaveBeenCalled());
    expect(mockMergeOnLogin).not.toHaveBeenCalled();
  });
});
