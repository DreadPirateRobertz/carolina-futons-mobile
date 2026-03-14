import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { CartProvider, useCart, mergeCartItems, type CartItem } from '../useCart';
import { AuthContext } from '@/hooks/useAuth';
import { ConnectivityProvider } from '../useConnectivity';
import { FUTON_MODELS, FABRICS } from '@/data/futons';
import { _resetForTesting } from '@/services/offlineQueue';

let mockUser: { id: string; email: string; displayName: string; provider: string } | null = null;

// Mock Wix config
jest.mock('@/services/wix/config', () => ({
  isWixConfigured: jest.fn().mockReturnValue(false),
  getWixConfig: jest.fn().mockReturnValue({ apiKey: 'test', siteId: 'test' }),
}));

// Mock WixClient
const mockGetCart = jest.fn().mockResolvedValue({ lineItems: [] });
const mockAddToCart = jest.fn().mockResolvedValue(undefined);
jest.mock('@/services/wix/wixClient', () => ({
  WixClient: jest.fn().mockImplementation(() => ({
    getCart: mockGetCart,
    addToCart: mockAddToCart,
  })),
}));

const asheville = FUTON_MODELS[0]; // $349
const blueRidge = FUTON_MODELS[1]; // $449
const naturalLinen = FABRICS[0]; // $0
const mountainBlue = FABRICS[2]; // $29
const espressoBrown = FABRICS[5]; // $49

/** Test harness that exposes cart state + actions */
function CartHarness() {
  const { items, itemCount, subtotal, syncing, addItem, removeItem, updateQuantity, clearCart } =
    useCart();

  return (
    <View>
      <Text testID="item-count">{itemCount}</Text>
      <Text testID="subtotal">{subtotal}</Text>
      <Text testID="syncing">{syncing ? 'true' : 'false'}</Text>
      <Text testID="items-json">
        {JSON.stringify(items.map((i) => ({ id: i.id, qty: i.quantity, unit: i.unitPrice })))}
      </Text>

      <TouchableOpacity
        testID="add-asheville-linen"
        onPress={() => addItem(asheville, naturalLinen, 1)}
      />
      <TouchableOpacity
        testID="add-asheville-linen-2"
        onPress={() => addItem(asheville, naturalLinen, 2)}
      />
      <TouchableOpacity
        testID="add-blueridge-blue"
        onPress={() => addItem(blueRidge, mountainBlue, 1)}
      />
      <TouchableOpacity
        testID="add-asheville-espresso"
        onPress={() => addItem(asheville, espressoBrown, 1)}
      />
      <TouchableOpacity
        testID="remove-asheville-linen"
        onPress={() => removeItem('asheville-full:natural-linen')}
      />
      <TouchableOpacity
        testID="update-qty-3"
        onPress={() => updateQuantity('asheville-full:natural-linen', 3)}
      />
      <TouchableOpacity
        testID="update-qty-0"
        onPress={() => updateQuantity('asheville-full:natural-linen', 0)}
      />
      <TouchableOpacity
        testID="update-qty-15"
        onPress={() => updateQuantity('asheville-full:natural-linen', 15)}
      />
      <TouchableOpacity testID="clear" onPress={clearCart} />
    </View>
  );
}

const mockAuthValue = {
  user: null as typeof mockUser,
  loading: false,
  error: null,
  isAuthenticated: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signInWithGoogle: jest.fn(),
  signInWithApple: jest.fn(),
  resetPassword: jest.fn(),
  signOut: jest.fn(),
  clearError: jest.fn(),
  updateProfile: jest.fn(),
};

beforeEach(() => {
  _resetForTesting();
});

function renderCart() {
  return render(
    <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
      <AuthContext.Provider value={{ ...mockAuthValue, user: mockUser as any }}>
        <CartProvider>
          <CartHarness />
        </CartProvider>
      </AuthContext.Provider>
    </ConnectivityProvider>,
  );
}

beforeEach(() => {
  mockUser = null;
  mockGetCart.mockResolvedValue({ lineItems: [] });
  mockAddToCart.mockResolvedValue(undefined);
});

describe('useCart', () => {
  describe('Initial state', () => {
    it('starts with empty cart', () => {
      const { getByTestId } = renderCart();
      expect(getByTestId('item-count').props.children).toBe(0);
      expect(getByTestId('subtotal').props.children).toBe(0);
    });
  });

  describe('Adding items', () => {
    it('adds a single item', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      expect(getByTestId('item-count').props.children).toBe(1);
      expect(getByTestId('subtotal').props.children).toBe(349);
    });

    it('merges same model+fabric by increasing quantity', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      fireEvent.press(getByTestId('add-asheville-linen'));
      expect(getByTestId('item-count').props.children).toBe(2);
      expect(getByTestId('subtotal').props.children).toBe(698);
    });

    it('adds different models as separate items', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      fireEvent.press(getByTestId('add-blueridge-blue'));
      expect(getByTestId('item-count').props.children).toBe(2);
      // $349 + ($449+$29) = $827
      expect(getByTestId('subtotal').props.children).toBe(827);
    });

    it('adds same model with different fabrics as separate items', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      fireEvent.press(getByTestId('add-asheville-espresso'));
      expect(getByTestId('item-count').props.children).toBe(2);
      // $349 + ($349+$49) = $747
      expect(getByTestId('subtotal').props.children).toBe(747);
    });

    it('adds item with quantity > 1', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen-2'));
      expect(getByTestId('item-count').props.children).toBe(2);
      expect(getByTestId('subtotal').props.children).toBe(698);
    });

    it('caps merged quantity at 10', () => {
      const { getByTestId } = renderCart();
      // Add 2 five times = would be 10, then add 2 more = still 10
      for (let i = 0; i < 5; i++) {
        fireEvent.press(getByTestId('add-asheville-linen-2'));
      }
      expect(getByTestId('item-count').props.children).toBe(10);
      fireEvent.press(getByTestId('add-asheville-linen-2'));
      expect(getByTestId('item-count').props.children).toBe(10);
    });
  });

  describe('Removing items', () => {
    it('removes an item by id', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      fireEvent.press(getByTestId('add-blueridge-blue'));
      expect(getByTestId('item-count').props.children).toBe(2);
      fireEvent.press(getByTestId('remove-asheville-linen'));
      expect(getByTestId('item-count').props.children).toBe(1);
      expect(getByTestId('subtotal').props.children).toBe(478);
    });

    it('does nothing when removing nonexistent id', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      fireEvent.press(getByTestId('remove-asheville-linen'));
      fireEvent.press(getByTestId('remove-asheville-linen')); // already gone
      expect(getByTestId('item-count').props.children).toBe(0);
    });
  });

  describe('Updating quantity', () => {
    it('updates quantity to specific value', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      fireEvent.press(getByTestId('update-qty-3'));
      expect(getByTestId('item-count').props.children).toBe(3);
      expect(getByTestId('subtotal').props.children).toBe(1047);
    });

    it('removes item when quantity set to 0', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      fireEvent.press(getByTestId('update-qty-0'));
      expect(getByTestId('item-count').props.children).toBe(0);
    });

    it('caps quantity at 10', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      fireEvent.press(getByTestId('update-qty-15'));
      expect(getByTestId('item-count').props.children).toBe(10);
    });
  });

  describe('Clearing cart', () => {
    it('removes all items', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('add-asheville-linen'));
      fireEvent.press(getByTestId('add-blueridge-blue'));
      expect(getByTestId('item-count').props.children).toBe(2);
      fireEvent.press(getByTestId('clear'));
      expect(getByTestId('item-count').props.children).toBe(0);
      expect(getByTestId('subtotal').props.children).toBe(0);
    });

    it('clearing empty cart is a no-op', () => {
      const { getByTestId } = renderCart();
      fireEvent.press(getByTestId('clear'));
      expect(getByTestId('item-count').props.children).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('throws when useCart called outside CartProvider', () => {
      function BadComponent() {
        useCart();
        return null;
      }
      expect(() =>
        render(
          <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
            <BadComponent />
          </ConnectivityProvider>,
        ),
      ).toThrow('useCart must be used within a CartProvider');
    });
  });
});

describe('mergeCartItems', () => {
  const makeItem = (modelIdx: number, fabricIdx: number, qty: number): CartItem => {
    const model = FUTON_MODELS[modelIdx];
    const fabric = FABRICS[fabricIdx];
    return {
      id: `${model.id}:${fabric.id}`,
      model,
      fabric,
      quantity: qty,
      unitPrice: model.basePrice + fabric.price,
    };
  };

  it('returns local items when server is empty', () => {
    const local = [makeItem(0, 0, 2)];
    const result = mergeCartItems(local, []);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(2);
  });

  it('returns server items when local is empty', () => {
    const server = [makeItem(0, 0, 3)];
    const result = mergeCartItems([], server);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
  });

  it('keeps higher quantity for duplicate items', () => {
    const local = [makeItem(0, 0, 2)];
    const server = [makeItem(0, 0, 5)];
    const result = mergeCartItems(local, server);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(5);
  });

  it('keeps local quantity when higher than server', () => {
    const local = [makeItem(0, 0, 7)];
    const server = [makeItem(0, 0, 3)];
    const result = mergeCartItems(local, server);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(7);
  });

  it('unions items unique to each side', () => {
    const local = [makeItem(0, 0, 1)];
    const server = [makeItem(1, 2, 2)];
    const result = mergeCartItems(local, server);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(`${FUTON_MODELS[0].id}:${FABRICS[0].id}`);
    expect(result[1].id).toBe(`${FUTON_MODELS[1].id}:${FABRICS[2].id}`);
  });

  it('caps merged quantity at 10', () => {
    const local = [makeItem(0, 0, 8)];
    const server = [makeItem(0, 0, 12)];
    const result = mergeCartItems(local, server);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(10);
  });

  it('handles complex merge with overlapping and unique items', () => {
    const local = [makeItem(0, 0, 2), makeItem(0, 2, 1)];
    const server = [makeItem(0, 0, 4), makeItem(1, 0, 3)];
    const result = mergeCartItems(local, server);
    expect(result).toHaveLength(3);
    // Overlapping: asheville+linen — server has higher qty
    expect(result[0].quantity).toBe(4);
    // Local-only: asheville+mountain-blue
    expect(result[1].quantity).toBe(1);
    // Server-only: blue-ridge+linen
    expect(result[2].quantity).toBe(3);
  });
});

describe('Server cart merge on auth', () => {
  const { isWixConfigured } = require('@/services/wix/config');

  beforeEach(() => {
    (isWixConfigured as jest.Mock).mockReturnValue(true);
    mockGetCart.mockClear();
    mockAddToCart.mockClear();
  });

  it('merges server cart items when user authenticates', async () => {
    mockGetCart.mockResolvedValue({
      lineItems: [
        {
          _id: 'wix-1',
          catalogReference: {
            catalogItemId: FUTON_MODELS[1].id,
            appId: 'wix-stores',
            options: { variantId: FABRICS[2].id },
          },
          quantity: 2,
        },
      ],
    });

    // Start unauthenticated
    mockUser = null;
    const { getByTestId, rerender } = renderCart();

    // Add a local item
    fireEvent.press(getByTestId('add-asheville-linen'));
    expect(getByTestId('item-count').props.children).toBe(1);

    // Simulate auth — re-render with user
    const testUser = { id: 'u1', email: 'test@test.com', displayName: 'Test', provider: 'wix' };
    mockUser = testUser;
    rerender(
      <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
        <AuthContext.Provider value={{ ...mockAuthValue, user: testUser as any }}>
          <CartProvider>
            <CartHarness />
          </CartProvider>
        </AuthContext.Provider>
      </ConnectivityProvider>,
    );

    // Wait for async merge to complete
    await waitFor(() => {
      expect(getByTestId('syncing').props.children).toBe('false');
    });

    // Should have local item + server item
    expect(getByTestId('item-count').props.children).toBe(3); // 1 local + 2 server
  });

  it('pushes local-only items to server', async () => {
    mockGetCart.mockResolvedValue({ lineItems: [] });

    mockUser = null;
    const { getByTestId, rerender } = renderCart();

    fireEvent.press(getByTestId('add-asheville-linen'));

    const testUser = { id: 'u1', email: 'test@test.com', displayName: 'Test', provider: 'wix' };
    mockUser = testUser;
    rerender(
      <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
        <AuthContext.Provider value={{ ...mockAuthValue, user: testUser as any }}>
          <CartProvider>
            <CartHarness />
          </CartProvider>
        </AuthContext.Provider>
      </ConnectivityProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('syncing').props.children).toBe('false');
    });

    expect(mockAddToCart).toHaveBeenCalledWith(FUTON_MODELS[0].id, 1, FABRICS[0].id);
  });

  it('skips merge when Wix is not configured', async () => {
    (isWixConfigured as jest.Mock).mockReturnValue(false);

    mockUser = null;
    const { getByTestId, rerender } = renderCart();

    fireEvent.press(getByTestId('add-asheville-linen'));

    const testUser = { id: 'u1', email: 'test@test.com', displayName: 'Test', provider: 'wix' };
    mockUser = testUser;
    rerender(
      <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
        <AuthContext.Provider value={{ ...mockAuthValue, user: testUser as any }}>
          <CartProvider>
            <CartHarness />
          </CartProvider>
        </AuthContext.Provider>
      </ConnectivityProvider>,
    );

    // Should not call server
    expect(mockGetCart).not.toHaveBeenCalled();
    // Local cart unchanged
    expect(getByTestId('item-count').props.children).toBe(1);
  });

  it('handles server errors gracefully', async () => {
    mockGetCart.mockRejectedValue(new Error('Network error'));

    mockUser = null;
    const { getByTestId, rerender } = renderCart();

    fireEvent.press(getByTestId('add-asheville-linen'));

    const testUser = { id: 'u1', email: 'test@test.com', displayName: 'Test', provider: 'wix' };
    mockUser = testUser;
    rerender(
      <ConnectivityProvider initialOnline={true} skipNetInfo={true}>
        <AuthContext.Provider value={{ ...mockAuthValue, user: testUser as any }}>
          <CartProvider>
            <CartHarness />
          </CartProvider>
        </AuthContext.Provider>
      </ConnectivityProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('syncing').props.children).toBe('false');
    });

    // Local cart should be preserved
    expect(getByTestId('item-count').props.children).toBe(1);
  });
});
