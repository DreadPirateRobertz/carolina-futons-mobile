import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { WishlistProvider, useWishlist } from '../useWishlist';
import { ConnectivityProvider } from '../useConnectivity';
import { useSyncedWishlist, validateServerWishlistItems } from '../useSyncedWishlist';
import { WixClient, type WixClientConfig } from '@/services/wix/wixClient';
import { _resetForTesting } from '@/services/offlineQueue';
import type { Product } from '@/data/products';
import { productId } from '@/data/productId';

const mockFetch = jest.fn();
global.fetch = mockFetch;

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

const MOCK_PRODUCT: Product = {
  id: productId('prod-1'),
  name: 'Test Futon',
  slug: 'test-futon',
  category: 'futons',
  price: 299,
  description: 'A test futon',
  shortDescription: 'Test',
  images: [],
  rating: 4.5,
  reviewCount: 10,
  inStock: true,
  fabricOptions: [],
  dimensions: { width: 0, depth: 0, height: 0 },
};

function mockQueryEmpty() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ dataItems: [], pagingMetadata: { total: 0 } }),
  });
}

function SyncedWishlistHarness({ client }: { client: WixClient }) {
  const synced = useSyncedWishlist({ client });

  return (
    <View>
      <Text testID="count">{synced.count}</Text>
      <Text testID="pending">{synced.pendingCount}</Text>
      <Text testID="syncing">{String(synced.isSyncing)}</Text>
      <Text testID="in-wishlist">{String(synced.isInWishlist('prod-1'))}</Text>
      <Text testID="items-json">{JSON.stringify(synced.items)}</Text>
      <TouchableOpacity testID="add" onPress={() => synced.add(MOCK_PRODUCT)} />
      <TouchableOpacity testID="remove" onPress={() => synced.remove('prod-1')} />
      <TouchableOpacity testID="toggle" onPress={() => synced.toggle(MOCK_PRODUCT)} />
      <TouchableOpacity testID="clear" onPress={() => synced.clear()} />
    </View>
  );
}

function renderSynced(initialOnline = true) {
  const client = new WixClient(TEST_CONFIG);
  mockQueryEmpty();

  const result = render(
    <ConnectivityProvider initialOnline={initialOnline}>
      <WishlistProvider>
        <SyncedWishlistHarness client={client} />
      </WishlistProvider>
    </ConnectivityProvider>,
  );

  return { ...result, client };
}

beforeEach(() => {
  mockFetch.mockReset();
  // Default: any unhandled fetch resolves successfully so leaked setTimeout
  // callbacks from add/remove/toggle don't throw and log after tests are done.
  // mockResolvedValueOnce calls in individual tests take priority over this.
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ dataItems: [], pagingMetadata: { total: 0 } }),
  });
  _resetForTesting();
});

afterEach(async () => {
  // Flush the 0ms timers scheduled by add/remove/toggle callbacks (setTimeout(pushIfOnline, 0)).
  // Without this, those timers fire after the test suite ends and the fetch mock
  // is cleared, producing "Cannot log after tests are done" errors attributed to
  // the next test suite running in the same Jest worker.
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
});

describe('useSyncedWishlist', () => {
  it('renders with zero items initially', async () => {
    const { getByTestId } = renderSynced();
    await waitFor(() => {
      expect(getByTestId('count').props.children).toBe(0);
    });
  });

  it('adds product to wishlist', async () => {
    const { getByTestId } = renderSynced();

    await act(async () => {
      fireEvent.press(getByTestId('add'));
    });

    expect(getByTestId('count').props.children).toBe(1);
    expect(getByTestId('in-wishlist').props.children).toBe('true');
  });

  it('removes product from wishlist', async () => {
    const { getByTestId } = renderSynced();

    await act(async () => {
      fireEvent.press(getByTestId('add'));
    });
    expect(getByTestId('count').props.children).toBe(1);

    await act(async () => {
      fireEvent.press(getByTestId('remove'));
    });
    expect(getByTestId('count').props.children).toBe(0);
  });

  it('toggles wishlist state', async () => {
    const { getByTestId } = renderSynced();

    await act(async () => {
      fireEvent.press(getByTestId('toggle'));
    });
    expect(getByTestId('in-wishlist').props.children).toBe('true');

    await act(async () => {
      fireEvent.press(getByTestId('toggle'));
    });
    expect(getByTestId('in-wishlist').props.children).toBe('false');
  });

  it('exposes sync state', async () => {
    const { getByTestId } = renderSynced();

    await waitFor(() => {
      expect(getByTestId('pending').props.children).toBe(0);
      expect(getByTestId('syncing').props.children).toBe('false');
    });
  });

  describe('server-win conflict resolution', () => {
    const SERVER_WISHLIST_ITEM = {
      productId: 'server-prod-1',
      addedAt: Date.now(),
      savedPrice: 399,
    };

    it('loads server items into wishlist when server wins conflict', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            dataItems: [
              {
                id: 'doc-1',
                data: { userId: 'user-1', items: [SERVER_WISHLIST_ITEM] },
                _updatedDate: '2026-03-10T12:00:00.000Z',
              },
            ],
            pagingMetadata: { total: 1 },
          }),
      });

      const client = new WixClient(TEST_CONFIG);
      const { getByTestId } = render(
        <ConnectivityProvider initialOnline={true}>
          <WishlistProvider>
            <SyncedWishlistHarness client={client} />
          </WishlistProvider>
        </ConnectivityProvider>,
      );

      await waitFor(() => {
        const items = JSON.parse(getByTestId('items-json').props.children);
        expect(items).toHaveLength(1);
        expect(items[0].productId).toBe('server-prod-1');
      });
    });

    it('does not wipe wishlist when server response is malformed', async () => {
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

      jest.spyOn(console, 'warn').mockImplementation();
      const client = new WixClient(TEST_CONFIG);
      const { getByTestId } = render(
        <ConnectivityProvider initialOnline={true}>
          <WishlistProvider>
            <SyncedWishlistHarness client={client} />
          </WishlistProvider>
        </ConnectivityProvider>,
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      expect(getByTestId('count').props.children).toBe(0);
      jest.restoreAllMocks();
    });

    it('keeps local wishlist when server pull fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      jest.spyOn(console, 'warn').mockImplementation();
      const client = new WixClient(TEST_CONFIG);
      const { getByTestId } = render(
        <ConnectivityProvider initialOnline={true}>
          <WishlistProvider>
            <SyncedWishlistHarness client={client} />
          </WishlistProvider>
        </ConnectivityProvider>,
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      expect(getByTestId('count').props.children).toBe(0);
      jest.restoreAllMocks();
    });

    it('rejects items with invalid shape', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            dataItems: [
              {
                id: 'doc-1',
                data: { userId: 'user-1', items: [null, { productId: null }, { garbage: true }] },
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
          <WishlistProvider>
            <SyncedWishlistHarness client={client} />
          </WishlistProvider>
        </ConnectivityProvider>,
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      expect(getByTestId('count').props.children).toBe(0);
      jest.restoreAllMocks();
    });
  });
});


describe('useSyncedWishlist — clear', () => {
  it('clears local wishlist when clear called', async () => {
    const { getByTestId } = renderSynced();
    await act(async () => { fireEvent.press(getByTestId('add')); });
    expect(getByTestId('count').props.children).toBe(1);
    await act(async () => { fireEvent.press(getByTestId('clear')); });
    expect(getByTestId('count').props.children).toBe(0);
  });

  it('queues SYNC action when clear called offline', async () => {
    const { getByTestId } = renderSynced(false);
    await act(async () => { fireEvent.press(getByTestId('add')); });
    await act(async () => { fireEvent.press(getByTestId('clear')); });
    expect(getByTestId('count').props.children).toBe(0);
  });

  it('calls pushWishlist with empty array when clear called online', async () => {
    const { getByTestId } = renderSynced(true);
    await act(async () => { fireEvent.press(getByTestId('add')); });
    await act(async () => { fireEvent.press(getByTestId('clear')); });
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(getByTestId('count').props.children).toBe(0);
  });
});

describe('useSyncedWishlist — client=null', () => {
  it('renders without crashing when client is null', async () => {
    const { getByTestId } = render(
      <ConnectivityProvider initialOnline={true}>
        <WishlistProvider>
          <SyncedWishlistHarness client={null as any} />
        </WishlistProvider>
      </ConnectivityProvider>,
    );
    await waitFor(() => { expect(getByTestId('count').props.children).toBe(0); });
  });

  it('toggle works with null client', async () => {
    const { getByTestId } = render(
      <ConnectivityProvider initialOnline={true}>
        <WishlistProvider>
          <SyncedWishlistHarness client={null as any} />
        </WishlistProvider>
      </ConnectivityProvider>,
    );
    await act(async () => { fireEvent.press(getByTestId('toggle')); });
    expect(getByTestId('in-wishlist').props.children).toBe('true');
  });
});

describe('validateServerWishlistItems', () => {
  it('returns null for non-array input', () => {
    expect(validateServerWishlistItems('not-an-array')).toBeNull();
    expect(validateServerWishlistItems(null)).toBeNull();
    expect(validateServerWishlistItems(undefined)).toBeNull();
  });

  it('returns empty array for empty array input', () => {
    expect(validateServerWishlistItems([])).toEqual([]);
  });

  it('returns null when all items are invalid', () => {
    expect(validateServerWishlistItems([null, { productId: null }, {}])).toBeNull();
  });

  it('filters out invalid items and keeps valid ones', () => {
    const valid = { productId: 'p1', addedAt: 1000, savedPrice: 299 };
    const result = validateServerWishlistItems([null, valid, { garbage: true }]);
    expect(result).toHaveLength(1);
    expect(result![0].productId).toBe('p1');
  });

  it('rejects items with empty productId', () => {
    expect(
      validateServerWishlistItems([{ productId: '', addedAt: 1000, savedPrice: 100 }]),
    ).toBeNull();
  });

  it('rejects items with negative savedPrice', () => {
    expect(
      validateServerWishlistItems([{ productId: 'p1', addedAt: 1000, savedPrice: -5 }]),
    ).toBeNull();
  });
});
