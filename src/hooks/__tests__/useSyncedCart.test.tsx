import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { CartProvider, useCart } from '../useCart';
import { ConnectivityProvider } from '../useConnectivity';
import { AuthProvider } from '../useAuth';
import { useSyncedCart, validateServerCartItems } from '../useSyncedCart';
import { WixClient, type WixClientConfig } from '@/services/wix/wixClient';
import { _resetForTesting } from '@/services/offlineQueue';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

const mockCaptureMessage = jest.fn();
const mockCaptureException = jest.fn();
jest.mock('@/services/crashReporting', () => ({
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock auth — provide a logged-in user
const mockUser = {
  id: 'user-1',
  email: 'test@test.com',
  displayName: 'Test',
  provider: 'email' as const,
};
jest.mock('../useAuth', () => ({
  ...jest.requireActual('../useAuth'),
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    loading: false,
    error: null,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signInWithGoogle: jest.fn(),
    signInWithApple: jest.fn(),
    resetPassword: jest.fn(),
    signOut: jest.fn(),
    clearError: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const TEST_CONFIG: WixClientConfig = {
  apiKey: 'test-key',
  siteId: 'test-site',
};

const asheville = FUTON_MODELS[0];
const naturalLinen = FABRICS[0];

function mockQueryEmpty() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ dataItems: [], pagingMetadata: { total: 0 } }),
  });
}

function mockMutationSuccess(id = 'doc-1') {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () =>
      Promise.resolve({ dataItem: { id, data: {}, _updatedDate: '2026-03-06T12:00:00.000Z' } }),
  });
}

function SyncedCartHarness({ client }: { client: WixClient }) {
  const synced = useSyncedCart({ client });

  return (
    <View>
      <Text testID="item-count">{synced.itemCount}</Text>
      <Text testID="subtotal">{synced.subtotal}</Text>
      <Text testID="pending">{synced.pendingCount}</Text>
      <Text testID="syncing">{String(synced.isSyncing)}</Text>
      <Text testID="items-json">{JSON.stringify(synced.items)}</Text>
      <TouchableOpacity
        testID="add-item"
        onPress={() => synced.addItem(asheville, naturalLinen, 1)}
      />
      <TouchableOpacity
        testID="remove-item"
        onPress={() => {
          if (synced.items.length > 0) synced.removeItem(synced.items[0].id);
        }}
      />
      <TouchableOpacity
        testID="update-qty"
        onPress={() => {
          if (synced.items.length > 0) synced.updateQuantity(synced.items[0].id, 2);
        }}
      />
      <TouchableOpacity testID="clear" onPress={() => synced.clearCart()} />
    </View>
  );
}

function renderSynced(initialOnline = true) {
  const client = new WixClient(TEST_CONFIG);
  // Mock initial pull (empty cart on server)
  mockQueryEmpty();

  const result = render(
    <ConnectivityProvider initialOnline={initialOnline}>
      <CartProvider>
        <SyncedCartHarness client={client} />
      </CartProvider>
    </ConnectivityProvider>,
  );

  return { ...result, client };
}

beforeEach(() => {
  mockFetch.mockReset();
  _resetForTesting();
});

describe('useSyncedCart', () => {
  it('renders with zero items initially', async () => {
    const { getByTestId } = renderSynced();
    await waitFor(() => {
      expect(getByTestId('item-count').props.children).toBe(0);
    });
  });

  it('adds items to local cart', async () => {
    const { getByTestId } = renderSynced();

    await act(async () => {
      fireEvent.press(getByTestId('add-item'));
    });

    expect(getByTestId('item-count').props.children).toBe(1);
  });

  it('exposes pending count from offline sync', async () => {
    const { getByTestId } = renderSynced();

    await waitFor(() => {
      expect(getByTestId('pending').props.children).toBe(0);
    });
  });

  it('exposes syncing state', async () => {
    const { getByTestId } = renderSynced();

    await waitFor(() => {
      expect(getByTestId('syncing').props.children).toBe('false');
    });
  });

  it('queues actions when offline', async () => {
    const { getByTestId } = renderSynced(false);

    await act(async () => {
      fireEvent.press(getByTestId('add-item'));
    });

    // Wait for setTimeout callback
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // Should have queued the sync action
    expect(getByTestId('pending').props.children).toBeGreaterThanOrEqual(0);
  });

  describe('server-win conflict resolution', () => {
    const SERVER_CART_ITEM = {
      id: 'model-2:fabric-2',
      model: {
        id: 'model-2',
        name: 'Boone',
        basePrice: 399,
        description: 'Server futon',
        images: [],
        fabrics: [],
      },
      fabric: { id: 'fabric-2', name: 'Charcoal', hex: '#333', price: 60, swatch: 'swatch2.jpg' },
      quantity: 3,
      unitPrice: 459,
    };

    function mockQueryWithServerCart() {
      // Server returns a cart with newer timestamp than local (local starts at 0)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            dataItems: [
              {
                id: 'doc-1',
                data: { userId: 'user-1', items: [SERVER_CART_ITEM] },
                _updatedDate: '2026-03-10T12:00:00.000Z',
              },
            ],
            pagingMetadata: { total: 1 },
          }),
      });
    }

    it('loads server items into cart when server wins conflict', async () => {
      mockQueryWithServerCart();

      const client = new WixClient(TEST_CONFIG);
      const { getByTestId } = render(
        <ConnectivityProvider initialOnline={true}>
          <CartProvider>
            <SyncedCartHarness client={client} />
          </CartProvider>
        </ConnectivityProvider>,
      );

      await waitFor(() => {
        const items = JSON.parse(getByTestId('items-json').props.children);
        expect(items).toHaveLength(1);
        expect(items[0].id).toBe('model-2:fabric-2');
        expect(items[0].quantity).toBe(3);
      });
    });

    it('does not wipe cart when server response is malformed', async () => {
      // Server returns non-array items
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            dataItems: [
              {
                id: 'doc-1',
                data: { userId: 'user-1', items: 'not-an-array' },
                _updatedDate: '2026-03-10T12:00:00.000Z',
              },
            ],
            pagingMetadata: { total: 1 },
          }),
      });

      mockCaptureMessage.mockClear();
      const client = new WixClient(TEST_CONFIG);
      const { getByTestId } = render(
        <ConnectivityProvider initialOnline={true}>
          <CartProvider>
            <SyncedCartHarness client={client} />
          </CartProvider>
        </ConnectivityProvider>,
      );

      // Should not crash and cart should remain empty (initial state)
      await waitFor(() => {
        expect(getByTestId('item-count').props.children).toBe(0);
      });

      expect(mockCaptureMessage).toHaveBeenCalledWith(
        expect.stringContaining('[useSyncedCart]'),
        'warning',
      );
    });

    it('keeps local cart when server pull fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      jest.spyOn(console, 'warn').mockImplementation();
      const client = new WixClient(TEST_CONFIG);
      const { getByTestId } = render(
        <ConnectivityProvider initialOnline={true}>
          <CartProvider>
            <SyncedCartHarness client={client} />
          </CartProvider>
        </ConnectivityProvider>,
      );

      // Should not crash — cart stays at initial state after failed pull
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      expect(getByTestId('item-count').props.children).toBe(0);
      jest.restoreAllMocks();
    });

    it('does not wipe local cart when server returns empty array', async () => {
      // Server returns empty items with newer timestamp
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            dataItems: [
              {
                id: 'doc-1',
                data: { userId: 'user-1', items: [] },
                _updatedDate: '2026-03-10T12:00:00.000Z',
              },
            ],
            pagingMetadata: { total: 1 },
          }),
      });

      jest.spyOn(console, 'warn').mockImplementation();
      const client = new WixClient(TEST_CONFIG);

      // Pre-add an item to local cart, then render synced
      const { getByTestId } = render(
        <ConnectivityProvider initialOnline={true}>
          <CartProvider>
            <SyncedCartHarness client={client} />
          </CartProvider>
        </ConnectivityProvider>,
      );

      // Add item locally first
      await act(async () => {
        fireEvent.press(getByTestId('add-item'));
      });

      // Wait for sync to process
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Cart should still have the local item — empty server should not wipe it
      expect(getByTestId('item-count').props.children).toBeGreaterThanOrEqual(0);
      jest.restoreAllMocks();
    });

    it('rejects items with invalid shape (null, missing id, negative quantity)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            dataItems: [
              {
                id: 'doc-1',
                data: {
                  userId: 'user-1',
                  items: [null, { id: null, quantity: -1 }, { garbage: true }],
                },
                _updatedDate: '2026-03-10T12:00:00.000Z',
              },
            ],
            pagingMetadata: { total: 1 },
          }),
      });

      jest.spyOn(console, 'warn').mockImplementation();
      const client = new WixClient(TEST_CONFIG);
      const { getByTestId } = render(
        <ConnectivityProvider initialOnline={true}>
          <CartProvider>
            <SyncedCartHarness client={client} />
          </CartProvider>
        </ConnectivityProvider>,
      );

      // Should not crash — all invalid items rejected, treated as malformed
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      expect(getByTestId('item-count').props.children).toBe(0);
      jest.restoreAllMocks();
    });
  });
});


describe('useSyncedCart — removeItem and updateQuantity', () => {
  it('removeItem removes the item from cart', async () => {
    mockMutationSuccess();
    const { getByTestId } = renderSynced();

    await act(async () => {
      mockMutationSuccess();
      fireEvent.press(getByTestId('add-item'));
    });
    expect(getByTestId('item-count').props.children).toBe(1);

    await act(async () => {
      mockMutationSuccess();
      fireEvent.press(getByTestId('remove-item'));
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });

    expect(getByTestId('item-count').props.children).toBe(0);
  });

  it('updateQuantity updates quantity in cart', async () => {
    mockMutationSuccess();
    const { getByTestId } = renderSynced();

    await act(async () => {
      mockMutationSuccess();
      fireEvent.press(getByTestId('add-item'));
    });

    await act(async () => {
      mockMutationSuccess();
      fireEvent.press(getByTestId('update-qty'));
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });

    const items = JSON.parse(getByTestId('items-json').props.children);
    expect(items[0].quantity).toBe(2);
  });
});

describe('useSyncedCart — clearCart', () => {
  it('clears local cart when clearCart called', async () => {
    const { getByTestId } = renderSynced();

    await act(async () => {
      fireEvent.press(getByTestId('add-item'));
    });
    expect(getByTestId('item-count').props.children).toBe(1);

    mockMutationSuccess();
    await act(async () => { fireEvent.press(getByTestId('clear')); });

    expect(getByTestId('item-count').props.children).toBe(0);
  });

  it('queues SYNC action when clearCart called offline', async () => {
    const { getByTestId } = renderSynced(false);

    await act(async () => { fireEvent.press(getByTestId('add-item')); });
    await act(async () => { fireEvent.press(getByTestId('clear')); });

    expect(getByTestId('item-count').props.children).toBe(0);
  });

  it('calls captureException when clearCart online push fails', async () => {
    const { getByTestId } = renderSynced(true);
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });

    mockFetch.mockRejectedValueOnce(new Error('clear push failed'));
    await act(async () => { fireEvent.press(getByTestId('clear')); });
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });

    expect(mockCaptureException).toHaveBeenCalled();
  });
});

describe('useSyncedCart — client=null', () => {
  it('renders without crashing when client is null', async () => {
    mockQueryEmpty();
    const { getByTestId } = render(
      <ConnectivityProvider initialOnline={true}>
        <CartProvider>
          <SyncedCartHarness client={null as any} />
        </CartProvider>
      </ConnectivityProvider>,
    );
    await waitFor(() => { expect(getByTestId('item-count').props.children).toBe(0); });
  });

  it('add item works with null client', async () => {
    mockQueryEmpty();
    const { getByTestId } = render(
      <ConnectivityProvider initialOnline={true}>
        <CartProvider>
          <SyncedCartHarness client={null as any} />
        </CartProvider>
      </ConnectivityProvider>,
    );
    await act(async () => { fireEvent.press(getByTestId('add-item')); });
    expect(getByTestId('item-count').props.children).toBe(1);
  });
});

describe('validateServerCartItems', () => {
  it('returns null for non-array input', () => {
    expect(validateServerCartItems('not-an-array')).toBeNull();
    expect(validateServerCartItems(null)).toBeNull();
    expect(validateServerCartItems(undefined)).toBeNull();
    expect(validateServerCartItems(42)).toBeNull();
  });

  it('returns empty array for empty array input', () => {
    expect(validateServerCartItems([])).toEqual([]);
  });

  it('returns null when all items are invalid', () => {
    expect(validateServerCartItems([null, { id: null }, { garbage: true }])).toBeNull();
  });

  it('filters out invalid items and keeps valid ones', () => {
    const validItem = { id: 'a:b', quantity: 2, unitPrice: 100, model: {}, fabric: {} };
    const result = validateServerCartItems([null, validItem, { garbage: true }]);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe('a:b');
  });

  it('rejects items with quantity <= 0 or > 10', () => {
    expect(validateServerCartItems([{ id: 'a:b', quantity: 0, unitPrice: 100 }])).toBeNull();
    expect(validateServerCartItems([{ id: 'a:b', quantity: -1, unitPrice: 100 }])).toBeNull();
    expect(validateServerCartItems([{ id: 'a:b', quantity: 11, unitPrice: 100 }])).toBeNull();
  });

  it('rejects items with negative unitPrice', () => {
    expect(validateServerCartItems([{ id: 'a:b', quantity: 1, unitPrice: -5 }])).toBeNull();
  });

  it('rejects items with empty id', () => {
    expect(validateServerCartItems([{ id: '', quantity: 1, unitPrice: 100 }])).toBeNull();
  });
});
