/**
 * useProducts — Wix mode gap tests.
 * Mocks isWixConfigured() = true and useOptionalWixClient to exercise the
 * Wix fetch path (lines 171-211), wixFiltered (lines 297-303),
 * resolvedProducts Wix branch (line 306-307), loadMore Wix branch (342-344),
 * and refresh Wix branch (357-362).
 */

// NOTE: jest.mock factories are hoisted. Variables referenced inside factories
// must be named with a `mock` prefix (Jest's guard against uninitialized vars).
const mockQueryProducts = jest.fn();

jest.mock('@/services/wix/config', () => ({
  isWixConfigured: () => true,
}));

// Return a stable object reference so wixClient doesn't change between renders
// (wixClient is a dep of the Wix fetch useEffect — a new ref each render = infinite loop)
const mockWixClient = {
  queryProducts: (...args: any[]) => mockQueryProducts(...args),
};

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useProducts } from '../useProducts';
import { PRODUCTS } from '@/data/products';

const MOCK_PRODUCTS = PRODUCTS.slice(0, 5);

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockQueryProducts.mockResolvedValue({
    products: MOCK_PRODUCTS,
    totalResults: MOCK_PRODUCTS.length,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

async function renderLoaded(options?: Parameters<typeof useProducts>[0]) {
  const hook = renderHook(() => useProducts(options));
  await act(async () => {});
  return hook;
}

describe('useProducts — Wix path', () => {
  it('fetches products from Wix client on mount', async () => {
    const { result } = await renderLoaded();
    expect(mockQueryProducts).toHaveBeenCalled();
    expect(result.current.products.length).toBe(MOCK_PRODUCTS.length);
  });

  it('isInitialLoading starts true, false after fetch', async () => {
    const hook = renderHook(() => useProducts());
    expect(hook.result.current.isInitialLoading).toBe(true);
    await act(async () => {});
    expect(hook.result.current.isInitialLoading).toBe(false);
  });

  it('sets fetchError when Wix fetch fails', async () => {
    mockQueryProducts.mockRejectedValue(new Error('Network unreachable'));
    const { result } = await renderLoaded();
    expect(result.current.fetchError).toBeInstanceOf(Error);
    expect(result.current.fetchError?.message).toBe('Network unreachable');
  });

  it('hasMore is true when totalResults > products returned', async () => {
    mockQueryProducts.mockResolvedValue({ products: MOCK_PRODUCTS, totalResults: 100 });
    const { result } = await renderLoaded();
    expect(result.current.hasMore).toBe(true);
  });

  it('hasMore is false when all results returned', async () => {
    const { result } = await renderLoaded();
    expect(result.current.hasMore).toBe(false);
  });

  it('loadMore increments page when hasMore=true', async () => {
    mockQueryProducts.mockResolvedValue({ products: MOCK_PRODUCTS, totalResults: 100 });
    const { result } = await renderLoaded();
    const callsBefore = mockQueryProducts.mock.calls.length;
    await act(async () => {
      result.current.loadMore();
    });
    await act(async () => {});
    expect(mockQueryProducts.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('loadMore no-ops when hasMore=false', async () => {
    const { result } = await renderLoaded();
    const callsBefore = mockQueryProducts.mock.calls.length;
    await act(async () => {
      result.current.loadMore();
    });
    await act(async () => {});
    expect(mockQueryProducts.mock.calls.length).toBe(callsBefore);
  });

  it('refresh triggers re-fetch', async () => {
    const { result } = await renderLoaded();
    mockQueryProducts.mockResolvedValue({
      products: MOCK_PRODUCTS,
      totalResults: MOCK_PRODUCTS.length,
    });
    await act(async () => {
      result.current.refresh();
    });
    await act(async () => {});
    expect(mockQueryProducts.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('isFromCache is false in Wix mode', async () => {
    const { result } = await renderLoaded();
    expect(result.current.isFromCache).toBe(false);
  });

  it('applies client-side category post-filter', async () => {
    const futons = PRODUCTS.filter((p) => p.category === 'futons').slice(0, 3);
    const covers = PRODUCTS.filter((p) => p.category === 'covers').slice(0, 2);
    mockQueryProducts.mockResolvedValue({ products: [...futons, ...covers], totalResults: 5 });
    const { result } = await renderLoaded({ initialCategory: 'futons' });
    result.current.products.forEach((p) => {
      expect(p.category).toBe('futons');
    });
  });
});
