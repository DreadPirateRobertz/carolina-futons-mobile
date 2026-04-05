/**
 * Tests for useBundleDeals (cm-6i5) — CMS integration with the shared
 * Wix BundleDeals collection (schema: name, products[], discountCode, price).
 *
 * Covers:
 *  - Fetches all bundles when no SKU filter provided (ShopScreen use case)
 *  - Filters by SKU when provided (PDP use case)
 *  - Resolves SKUs → Product catalog entries
 *  - Handles products field as array or JSON string (Wix may return either)
 *  - No wixClient → empty bundles, no error
 *  - Query failure → error state
 *  - Missing/malformed fields gracefully skipped
 *  - re-fetches when sku changes
 *  - Empty collection → empty array
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useBundleDeals } from '../useBundleDeals';
import { PRODUCTS } from '@/data/products';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockQueryData = jest.fn();
const mockUseOptionalWixClient = jest.fn();

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────────

/** Products that have SKUs defined in the catalog */
const PRODUCTS_WITH_SKU = PRODUCTS.filter((p) => p.sku);
const PRODUCT_A = PRODUCTS_WITH_SKU[0];
const PRODUCT_B = PRODUCTS_WITH_SKU[1];
// Use PRODUCT_B for the third fixture to avoid out-of-bounds if catalog is small
const PRODUCT_C = PRODUCTS_WITH_SKU[2] ?? PRODUCTS_WITH_SKU[1];

function makeRawBundle(overrides: {
  name?: string;
  products?: string[] | string;
  discountCode?: string;
  price?: number;
}) {
  return {
    name: overrides.name ?? 'The Bedroom Bundle',
    products: overrides.products ?? [PRODUCT_A.sku!, PRODUCT_B.sku!],
    discountCode: overrides.discountCode ?? 'BUNDLE10',
    price: overrides.price ?? 499,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOptionalWixClient.mockReturnValue({ queryData: mockQueryData });
  mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
});

// ── No wixClient ───────────────────────────────────────────────────────────────

describe('useBundleDeals — no wixClient', () => {
  beforeEach(() => {
    mockUseOptionalWixClient.mockReturnValue(null);
  });

  it('returns empty bundles when wixClient is null', async () => {
    const { result } = renderHook(() => useBundleDeals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.bundles).toEqual([]);
  });

  it('returns no error when wixClient is null', async () => {
    const { result } = renderHook(() => useBundleDeals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
  });

  it('does not call queryData when wixClient is null', async () => {
    renderHook(() => useBundleDeals());
    await waitFor(() => {});
    expect(mockQueryData).not.toHaveBeenCalled();
  });
});

// ── Collection query ───────────────────────────────────────────────────────────

describe('useBundleDeals — collection query', () => {
  it('queries the BundleDeals collection', async () => {
    renderHook(() => useBundleDeals());
    await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
    expect(mockQueryData.mock.calls[0][0]).toBe('BundleDeals');
  });

  it('fetches without a SKU filter when no sku arg provided', async () => {
    renderHook(() => useBundleDeals());
    await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
    const opts = mockQueryData.mock.calls[0][1];
    expect(opts?.filter).toBeUndefined();
  });

  it('applies $hasSome filter when sku is provided', async () => {
    renderHook(() => useBundleDeals(PRODUCT_A.sku));
    await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
    const opts = mockQueryData.mock.calls[0][1];
    expect(opts?.filter).toEqual({ products: { $hasSome: [PRODUCT_A.sku] } });
  });
});

// ── Bundle parsing ─────────────────────────────────────────────────────────────

describe('useBundleDeals — bundle parsing', () => {
  it('returns bundles with name, skus, discountCode, price', async () => {
    mockQueryData.mockResolvedValue({
      items: [makeRawBundle({ name: 'The Bundle', discountCode: 'SAVE20', price: 399 })],
      totalResults: 1,
    });
    const { result } = renderHook(() => useBundleDeals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const b = result.current.bundles[0];
    expect(b.name).toBe('The Bundle');
    expect(b.discountCode).toBe('SAVE20');
    expect(b.price).toBe(399);
  });

  it('skus array is populated from the products field', async () => {
    mockQueryData.mockResolvedValue({
      items: [makeRawBundle({ products: [PRODUCT_A.sku!, PRODUCT_B.sku!] })],
      totalResults: 1,
    });
    const { result } = renderHook(() => useBundleDeals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.bundles[0].skus).toEqual([PRODUCT_A.sku, PRODUCT_B.sku]);
  });

  it('parses products field when stored as JSON string', async () => {
    mockQueryData.mockResolvedValue({
      items: [makeRawBundle({ products: JSON.stringify([PRODUCT_A.sku!, PRODUCT_B.sku!]) })],
      totalResults: 1,
    });
    const { result } = renderHook(() => useBundleDeals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.bundles[0].skus).toEqual([PRODUCT_A.sku, PRODUCT_B.sku]);
  });

  it('resolves products by SKU from the catalog', async () => {
    mockQueryData.mockResolvedValue({
      items: [makeRawBundle({ products: [PRODUCT_A.sku!, PRODUCT_B.sku!] })],
      totalResults: 1,
    });
    const { result } = renderHook(() => useBundleDeals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const productIds = result.current.bundles[0].products.map((p) => p.id);
    expect(productIds).toContain(PRODUCT_A.id);
    expect(productIds).toContain(PRODUCT_B.id);
  });

  it('silently skips unknown SKUs', async () => {
    mockQueryData.mockResolvedValue({
      items: [makeRawBundle({ products: ['UNKNOWN-SKU', PRODUCT_A.sku!] })],
      totalResults: 1,
    });
    const { result } = renderHook(() => useBundleDeals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.bundles[0].products).toHaveLength(1);
    expect(result.current.bundles[0].products[0].id).toBe(PRODUCT_A.id);
  });

  it('returns multiple bundles', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        makeRawBundle({ name: 'Bundle A', products: [PRODUCT_A.sku!] }),
        makeRawBundle({ name: 'Bundle B', products: [PRODUCT_B.sku!] }),
      ],
      totalResults: 2,
    });
    const { result } = renderHook(() => useBundleDeals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.bundles).toHaveLength(2);
  });

  it('skips bundles missing required name field', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        { products: [PRODUCT_A.sku!], discountCode: 'X', price: 100 }, // no name
        makeRawBundle({ name: 'Valid Bundle' }),
      ],
      totalResults: 2,
    });
    const { result } = renderHook(() => useBundleDeals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.bundles).toHaveLength(1);
    expect(result.current.bundles[0].name).toBe('Valid Bundle');
  });

  it('skips bundles missing discountCode field', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        { name: 'Bundle', products: [PRODUCT_A.sku!], price: 100 }, // no discountCode
        makeRawBundle({ name: 'Valid' }),
      ],
      totalResults: 2,
    });
    const { result } = renderHook(() => useBundleDeals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.bundles).toHaveLength(1);
  });

  it('skips bundles missing price field', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        { name: 'Bundle', products: [PRODUCT_A.sku!], discountCode: 'X' }, // no price
        makeRawBundle({ name: 'Valid' }),
      ],
      totalResults: 2,
    });
    const { result } = renderHook(() => useBundleDeals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.bundles).toHaveLength(1);
  });

  it('handles bundle with empty products array', async () => {
    mockQueryData.mockResolvedValue({
      items: [makeRawBundle({ products: [] })],
      totalResults: 1,
    });
    const { result } = renderHook(() => useBundleDeals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.bundles[0].products).toEqual([]);
    expect(result.current.bundles[0].skus).toEqual([]);
  });

  it('returns empty array when collection has no items', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    const { result } = renderHook(() => useBundleDeals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.bundles).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});

// ── Loading state ──────────────────────────────────────────────────────────────

describe('useBundleDeals — loading state', () => {
  it('starts with isLoading=true', () => {
    mockQueryData.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useBundleDeals());
    expect(result.current.isLoading).toBe(true);
  });

  it('sets isLoading=false after successful fetch', async () => {
    const { result } = renderHook(() => useBundleDeals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('sets isLoading=false after fetch failure', async () => {
    mockQueryData.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useBundleDeals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});

// ── Error state ────────────────────────────────────────────────────────────────

describe('useBundleDeals — error state', () => {
  it('sets error when queryData rejects', async () => {
    mockQueryData.mockRejectedValue(new Error('Wix API error'));
    const { result } = renderHook(() => useBundleDeals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Wix API error');
  });

  it('returns empty bundles on error', async () => {
    mockQueryData.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useBundleDeals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.bundles).toEqual([]);
  });

  it('error is null on success', async () => {
    const { result } = renderHook(() => useBundleDeals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
  });
});

// ── SKU filter (PDP use case) ──────────────────────────────────────────────────

describe('useBundleDeals — SKU filter (PDP)', () => {
  it('returns bundles that include the given SKU', async () => {
    mockQueryData.mockResolvedValue({
      items: [makeRawBundle({ name: 'Matching Bundle', products: [PRODUCT_A.sku!, PRODUCT_B.sku!] })],
      totalResults: 1,
    });
    const { result } = renderHook(() => useBundleDeals(PRODUCT_A.sku));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.bundles).toHaveLength(1);
    expect(result.current.bundles[0].name).toBe('Matching Bundle');
  });

  it('re-fetches when sku changes', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    const { result, rerender } = renderHook(({ sku }) => useBundleDeals(sku), {
      initialProps: { sku: PRODUCT_A.sku },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockQueryData).toHaveBeenCalledTimes(1);

    rerender({ sku: PRODUCT_B.sku });
    await waitFor(() => expect(mockQueryData).toHaveBeenCalledTimes(2));
  });

  it('passes correct sku to the filter', async () => {
    renderHook(() => useBundleDeals(PRODUCT_C.sku));
    await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
    const opts = mockQueryData.mock.calls[0][1];
    expect(opts.filter).toEqual({ products: { $hasSome: [PRODUCT_C.sku] } });
  });
});
