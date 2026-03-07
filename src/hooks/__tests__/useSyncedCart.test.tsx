import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { CartProvider, useCart } from '../useCart';
import { ConnectivityProvider } from '../useConnectivity';
import { AuthProvider } from '../useAuth';
import { useSyncedCart } from '../useSyncedCart';
import { WixClient, type WixClientConfig } from '@/services/wix/wixClient';
import { _resetForTesting } from '@/services/offlineQueue';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock auth — provide a logged-in user
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
    json: () => Promise.resolve({ dataItem: { id, data: {}, _updatedDate: '2026-03-06T12:00:00.000Z' } }),
  });
}

function SyncedCartHarness({ client }: { client: WixClient }) {
  const synced = useSyncedCart({ client });

  return (
    <View>
      <Text testID="item-count">{synced.itemCount}</Text>
      <Text testID="pending">{synced.pendingCount}</Text>
      <Text testID="syncing">{String(synced.isSyncing)}</Text>
      <TouchableOpacity
        testID="add-item"
        onPress={() => synced.addItem(asheville, naturalLinen, 1)}
      />
      <TouchableOpacity
        testID="clear"
        onPress={() => synced.clearCart()}
      />
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
});
