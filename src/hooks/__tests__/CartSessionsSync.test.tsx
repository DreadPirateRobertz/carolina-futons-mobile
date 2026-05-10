/**
 * Tests for CartSessionsSync (hq-npba) — the internal component inside CartProvider
 * that wires useCartSessions to cart state and auth transitions.
 *
 * Covers:
 *  - saveCart called on every cart item change
 *  - saveCart maps CartItem → CartSessionItem correctly
 *  - mergeOnLogin called once on guest→member transition
 *  - mergeOnLogin NOT called on subsequent renders with same memberId
 *  - No calls when wixClient is absent (no-op)
 */
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { CartProvider, useCart } from '../useCart';
import { ConnectivityProvider } from '../useConnectivity';
import { AuthContext } from '@/hooks/useAuth';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSaveCart = jest.fn().mockResolvedValue(undefined);
const mockMergeOnLogin = jest.fn().mockResolvedValue([]);

jest.mock('../useCartSessions', () => ({
  useCartSessions: () => ({
    items: [],
    loading: false,
    loadError: null,
    saveError: null,
    saveCart: mockSaveCart,
    mergeOnLogin: mockMergeOnLogin,
  }),
}));

jest.mock('@/hooks/useGamificationEvents', () => ({
  useGamificationEvents: () => ({
    addToCart: jest.fn().mockResolvedValue({ success: true }),
    submitReview: jest.fn(),
    referralShared: jest.fn(),
    arUsed: jest.fn(),
    wishlistAdd: jest.fn(),
  }),
}));

jest.mock('@/services/wix/config', () => ({
  isWixConfigured: jest.fn().mockReturnValue(false),
  getWixConfig: jest.fn().mockReturnValue({ apiKey: 'test', siteId: 'test' }),
}));

jest.mock('@/services/wix/wixClient', () => ({
  WixClient: jest.fn().mockImplementation(() => ({
    getCart: jest.fn().mockResolvedValue({ lineItems: [] }),
    addToCart: jest.fn().mockResolvedValue(undefined),
  })),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const asheville = FUTON_MODELS[0];
const naturalLinen = FABRICS[0];

const mockAuthBase = {
  isAuthenticated: false,
  isLoading: false,
  error: null,
  signIn: jest.fn(),
  signOut: jest.fn(),
  clearError: jest.fn(),
  updateProfile: jest.fn(),
};

let mockUser: { id: string; email: string; displayName: string; provider: string } | null = null;

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={{ ...mockAuthBase, user: mockUser as any }}>
      <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
        <CartProvider>{children}</CartProvider>
      </ConnectivityProvider>
    </AuthContext.Provider>
  );
}

function CartHarness() {
  const { addItem } = useCart();
  return (
    <View>
      <TouchableOpacity testID="add-item" onPress={() => addItem(asheville, naturalLinen, 1)} />
    </View>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CartSessionsSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
  });

  it('calls saveCart with empty array on initial render', async () => {
    render(
      <Wrapper>
        <CartHarness />
      </Wrapper>,
    );
    await waitFor(() => expect(mockSaveCart).toHaveBeenCalledWith([]));
  });

  it('calls saveCart with mapped CartSessionItems after addItem', async () => {
    const { getByTestId } = render(
      <Wrapper>
        <CartHarness />
      </Wrapper>,
    );

    await act(async () => {
      fireEvent.press(getByTestId('add-item'));
    });

    await waitFor(() =>
      expect(mockSaveCart).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            productId: asheville.id,
            variantId: naturalLinen.id,
            quantity: 1,
          }),
        ]),
      ),
    );
  });

  it('does not call mergeOnLogin when user is null on mount', async () => {
    mockUser = null;
    render(
      <Wrapper>
        <CartHarness />
      </Wrapper>,
    );
    await waitFor(() => expect(mockSaveCart).toHaveBeenCalled());
    expect(mockMergeOnLogin).not.toHaveBeenCalled();
  });

  it('calls mergeOnLogin once on guest→member login transition', async () => {
    mockUser = null;
    const { rerender } = render(
      <Wrapper>
        <CartHarness />
      </Wrapper>,
    );

    await waitFor(() => expect(mockSaveCart).toHaveBeenCalled());
    expect(mockMergeOnLogin).not.toHaveBeenCalled();

    mockUser = { id: 'member-1', email: 'a@b.com', displayName: 'A', provider: 'wix' };
    rerender(
      <Wrapper>
        <CartHarness />
      </Wrapper>,
    );

    await waitFor(() => expect(mockMergeOnLogin).toHaveBeenCalledWith('member-1'));
    expect(mockMergeOnLogin).toHaveBeenCalledTimes(1);
  });

  it('does not call mergeOnLogin again on subsequent renders with same memberId', async () => {
    mockUser = { id: 'member-1', email: 'a@b.com', displayName: 'A', provider: 'wix' };
    const { rerender } = render(
      <Wrapper>
        <CartHarness />
      </Wrapper>,
    );

    await waitFor(() => expect(mockSaveCart).toHaveBeenCalled());

    // Rerender with same user — should not fire mergeOnLogin again
    rerender(
      <Wrapper>
        <CartHarness />
      </Wrapper>,
    );
    rerender(
      <Wrapper>
        <CartHarness />
      </Wrapper>,
    );

    expect(mockMergeOnLogin).toHaveBeenCalledTimes(1);
  });

  // ── CartItem → CartSessionItem field mapping ───────────────────────────────

  describe('CartItem → CartSessionItem mapping', () => {
    it('maps model.id to productId — not the composite CartItem.id', async () => {
      const { getByTestId } = render(
        <Wrapper>
          <CartHarness />
        </Wrapper>,
      );

      await act(async () => {
        fireEvent.press(getByTestId('add-item'));
      });

      await waitFor(() =>
        expect(mockSaveCart).toHaveBeenCalledWith(
          expect.arrayContaining([expect.objectContaining({ productId: asheville.id })]),
        ),
      );

      // The composite CartItem.id is '${model.id}:${fabric.id}' — must NOT be used as productId
      const lastCall = mockSaveCart.mock.calls[mockSaveCart.mock.calls.length - 1][0];
      const productId = lastCall[0]?.productId;
      expect(productId).not.toContain(':');
      expect(productId).toBe(asheville.id);
    });

    it('maps fabric.id to variantId — not the optional CartItem.variantId field', async () => {
      const { getByTestId } = render(
        <Wrapper>
          <CartHarness />
        </Wrapper>,
      );

      await act(async () => {
        fireEvent.press(getByTestId('add-item'));
      });

      await waitFor(() =>
        expect(mockSaveCart).toHaveBeenCalledWith(
          expect.arrayContaining([expect.objectContaining({ variantId: naturalLinen.id })]),
        ),
      );
    });

    it('maps quantity directly from CartItem.quantity', async () => {
      const { getByTestId } = render(
        <Wrapper>
          <CartHarness />
        </Wrapper>,
      );

      await act(async () => {
        fireEvent.press(getByTestId('add-item'));
      });

      await waitFor(() =>
        expect(mockSaveCart).toHaveBeenCalledWith(
          expect.arrayContaining([expect.objectContaining({ quantity: 1 })]),
        ),
      );
    });

    it('maps multiple items — all three fields correct for each', async () => {
      const secondModel = FUTON_MODELS[1] ?? asheville;
      const secondFabric = FABRICS[1] ?? naturalLinen;

      function MultiItemHarness() {
        const { addItem } = useCart();
        return (
          <View>
            <TouchableOpacity
              testID="add-first"
              onPress={() => addItem(asheville, naturalLinen, 2)}
            />
            <TouchableOpacity
              testID="add-second"
              onPress={() => addItem(secondModel, secondFabric, 3)}
            />
          </View>
        );
      }

      const { getByTestId } = render(
        <Wrapper>
          <MultiItemHarness />
        </Wrapper>,
      );

      await act(async () => {
        fireEvent.press(getByTestId('add-first'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('add-second'));
      });

      await waitFor(() => {
        const lastCall = mockSaveCart.mock.calls[mockSaveCart.mock.calls.length - 1][0];
        expect(lastCall).toHaveLength(2);
        expect(lastCall).toEqual(
          expect.arrayContaining([
            { productId: asheville.id, variantId: naturalLinen.id, quantity: 2 },
            { productId: secondModel.id, variantId: secondFabric.id, quantity: 3 },
          ]),
        );
      });
    });
  });
});
