import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { WishlistProvider, useWishlist } from '../useWishlist';
import { ConnectivityProvider } from '../useConnectivity';
import { useSyncedWishlist } from '../useSyncedWishlist';
import { WixClient, type WixClientConfig } from '@/services/wix/wixClient';
import { _resetForTesting } from '@/services/offlineQueue';
import type { Product } from '@/data/products';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockUser = { id: 'user-1', email: 'test@test.com', displayName: 'Test', provider: 'email' as const };
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
  id: 'prod-1',
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
      <TouchableOpacity
        testID="add"
        onPress={() => synced.add(MOCK_PRODUCT)}
      />
      <TouchableOpacity
        testID="remove"
        onPress={() => synced.remove('prod-1')}
      />
      <TouchableOpacity
        testID="toggle"
        onPress={() => synced.toggle(MOCK_PRODUCT)}
      />
      <TouchableOpacity
        testID="clear"
        onPress={() => synced.clear()}
      />
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
  _resetForTesting();
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
});
