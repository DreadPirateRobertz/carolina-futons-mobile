import { renderHook, act } from '@testing-library/react-native';
import { useCollections, useCollection } from '../useCollections';
import { COLLECTIONS } from '@/data/collections';

const mockQueryData = jest.fn();
const mockQueryProducts = jest.fn();

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => ({ queryData: mockQueryData, queryProducts: mockQueryProducts }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

describe('useCollections', () => {
  beforeEach(() => {
    mockQueryData.mockReset();
    mockQueryProducts.mockReset();
  });

  it('falls back to static collections when CMS returns empty', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    const { result } = renderHook(() => useCollections());
    await act(async () => {});
    expect(result.current.collections.length).toBeGreaterThanOrEqual(3);
  });

  it('falls back to static collections when CMS fetch fails', async () => {
    mockQueryData.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useCollections());
    await act(async () => {});
    expect(result.current.collections.length).toBeGreaterThanOrEqual(3);
  });

  it('uses CMS data when available', async () => {
    mockQueryData.mockResolvedValue({
      items: [
        {
          _id: 'cms-col-1',
          slug: 'cms-collection',
          title: 'CMS Collection',
          subtitle: 'From Wix CMS',
          description: 'A collection from the CMS',
          heroImageUrl: 'https://example.com/hero.jpg',
          heroImageAlt: 'CMS hero',
          mood: ['modern'],
          featured: true,
          productIds: ['prod-asheville-full'],
        },
      ],
      totalResults: 1,
    });
    const { result } = renderHook(() => useCollections());
    await act(async () => {});
    expect(result.current.collections[0].title).toBe('CMS Collection');
    expect(result.current.collections[0].slug).toBe('cms-collection');
  });

  it('returns featured collections', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    const { result } = renderHook(() => useCollections());
    await act(async () => {});
    expect(result.current.featured.length).toBeGreaterThan(0);
    for (const col of result.current.featured) {
      expect(col.featured).toBe(true);
    }
  });
});

describe('useCollection', () => {
  beforeEach(() => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
    mockQueryProducts.mockResolvedValue({ products: [], totalResults: 0 });
  });

  it('returns collection and resolved products for valid slug', async () => {
    const { result } = renderHook(() => useCollection('mountain-lodge-living'));
    await act(async () => {});
    expect(result.current.collection).toBeDefined();
    expect(result.current.collection!.title).toBe('Mountain Lodge Living');
    expect(result.current.products.length).toBeGreaterThan(0);
  });

  it('returns undefined collection for invalid slug', async () => {
    const { result } = renderHook(() => useCollection('nonexistent-slug'));
    await act(async () => {});
    expect(result.current.collection).toBeUndefined();
    expect(result.current.products).toEqual([]);
  });

  it('resolves product IDs to full Product objects', async () => {
    const { result } = renderHook(() => useCollection('mountain-lodge-living'));
    await act(async () => {});
    for (const product of result.current.products) {
      expect(product.id).toBeTruthy();
      expect(product.name).toBeTruthy();
      expect(product.price).toBeGreaterThan(0);
    }
  });

  it('fetches products from Wix API when available', async () => {
    mockQueryProducts.mockResolvedValue({
      products: [
        { id: 'wix-prod-1', name: 'Wix Product', slug: 'wix-product', price: 299, category: 'futons', description: '', shortDescription: '', images: [], rating: 4.5, reviewCount: 10, inStock: true, badge: null },
      ],
      totalResults: 1,
    });
    const { result } = renderHook(() => useCollection('mountain-lodge-living'));
    await act(async () => {});
    expect(mockQueryProducts).toHaveBeenCalled();
    expect(result.current.products[0].name).toBe('Wix Product');
  });

  it('falls back to static products when Wix fetch fails', async () => {
    mockQueryProducts.mockRejectedValue(new Error('API error'));
    const { result } = renderHook(() => useCollection('mountain-lodge-living'));
    await act(async () => {});
    expect(result.current.products.length).toBeGreaterThan(0);
    expect(result.current.products[0].id).toContain('prod-');
  });
});
