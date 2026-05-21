/**
 * FlatList performance prop tests — cm-perf2 (hq-r2fo)
 *
 * Verifies virtualization tuning on the two largest list screens:
 * - ShopScreen (product grid)
 * - OrderHistoryScreen (order rows)
 *
 * Required props per bead:
 *   - windowSize=5
 *   - maxToRenderPerBatch tuned (≤ 8)
 *   - updateCellsBatchingPeriod=100
 *   - removeClippedSubviews Android-only (false on iOS to avoid blank-cell flicker)
 *
 * Memoization is asserted by inspecting React.memo wrapping on the row components.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { ShopScreen } from '../ShopScreen';
import { OrderHistoryScreen } from '../OrderHistoryScreen';
import { ProductCard } from '@/components/ProductCard';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';
import { MOCK_ORDERS } from '@/data/orders';

const mockRefresh = jest.fn();
const mockUseOrders = jest.fn();
jest.mock('@/hooks/useOrders', () => ({
  ...jest.requireActual('@/hooks/useOrders'),
  useOrders: () => mockUseOrders(),
}));

jest.mock('@/hooks/usePurchaseExport', () => ({
  usePurchaseExport: () => ({
    status: 'idle',
    error: null,
    sendExport: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@/hooks/useCart', () => ({
  ...jest.requireActual('@/hooks/useCart'),
  useCart: () => ({
    addItem: jest.fn(),
    items: [],
    itemCount: 0,
    subtotal: 0,
    syncing: false,
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    pendingSync: 0,
    isSyncing: false,
    loadItems: jest.fn(),
    syncError: null,
    clearSyncError: jest.fn(),
  }),
}));

jest.mock('@/hooks/useFutonModels', () => ({
  ...jest.requireActual('@/hooks/useFutonModels'),
  useFutonModels: () => ({
    models: [],
    fabrics: [],
    isLoading: false,
    error: null,
    getModel: jest.fn((id: string) => ({ id, name: `Model ${id}`, basePrice: 349 })),
    getModelById: jest.fn((id: string) => ({ id, name: `Model ${id}`, basePrice: 349 })),
    getFabric: jest.fn((id: string) => ({ id, name: `Fabric ${id}`, price: 0 })),
    getModelForProduct: jest.fn(),
    refresh: jest.fn(),
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOrders.mockReturnValue({
    orders: [...MOCK_ORDERS],
    isLoading: false,
    error: null,
    refresh: mockRefresh,
    statusFilter: null,
    setStatusFilter: jest.fn(),
    getOrder: jest.fn(),
  });
});

describe('ShopScreen — FlatList virtualization props (cm-perf2)', () => {
  async function renderShop() {
    const result = render(
      <ThemeProvider>
        <WishlistProvider>
          <CompareProvider>
            <ShopScreen onProductPress={jest.fn()} />
          </CompareProvider>
        </WishlistProvider>
      </ThemeProvider>,
    );
    await waitFor(() => result.getByTestId('product-list'));
    return result;
  }

  it('product-list has windowSize=5', async () => {
    const { getByTestId } = await renderShop();
    expect(getByTestId('product-list').props.windowSize).toBe(5);
  });

  it('product-list has maxToRenderPerBatch ≤ 8', async () => {
    const { getByTestId } = await renderShop();
    expect(getByTestId('product-list').props.maxToRenderPerBatch).toBeLessThanOrEqual(8);
  });

  it('product-list has updateCellsBatchingPeriod=100', async () => {
    const { getByTestId } = await renderShop();
    expect(getByTestId('product-list').props.updateCellsBatchingPeriod).toBe(100);
  });

  it('product-list has removeClippedSubviews enabled', async () => {
    const { getByTestId } = await renderShop();
    expect(getByTestId('product-list').props.removeClippedSubviews).toBe(true);
  });
});

describe('OrderHistoryScreen — FlatList virtualization props (cm-perf2)', () => {
  function renderHistory() {
    return render(
      <ThemeProvider>
        <OrderHistoryScreen />
      </ThemeProvider>,
    );
  }

  it('order-list has windowSize=5', () => {
    const { getByTestId } = renderHistory();
    expect(getByTestId('order-list').props.windowSize).toBe(5);
  });

  it('order-list has maxToRenderPerBatch ≤ 8', () => {
    const { getByTestId } = renderHistory();
    expect(getByTestId('order-list').props.maxToRenderPerBatch).toBeLessThanOrEqual(8);
  });

  it('order-list has updateCellsBatchingPeriod=100', () => {
    const { getByTestId } = renderHistory();
    expect(getByTestId('order-list').props.updateCellsBatchingPeriod).toBe(100);
  });

  it('order-list removeClippedSubviews matches Platform.OS === android', () => {
    const { getByTestId } = renderHistory();
    expect(getByTestId('order-list').props.removeClippedSubviews).toBe(Platform.OS === 'android');
  });
});

describe('Row components are React.memo-wrapped (cm-perf2)', () => {
  it('ProductCard is memoized (prevents re-render on parent state change)', () => {
    // React.memo returns an object with $$typeof === Symbol.for('react.memo')
    // (or REACT_MEMO_TYPE in dev). We check the string description, which is
    // stable across React versions.
    const memoSymbol = (ProductCard as unknown as { $$typeof?: symbol }).$$typeof;
    expect(memoSymbol?.toString()).toBe('Symbol(react.memo)');
  });
});
