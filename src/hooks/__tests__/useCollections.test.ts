import { renderHook } from '@testing-library/react-native';
import { useCollections, useCollection } from '../useCollections';

describe('useCollections', () => {
  it('returns all collections', () => {
    const { result } = renderHook(() => useCollections());
    expect(result.current.collections.length).toBeGreaterThanOrEqual(3);
  });

  it('returns featured collections', () => {
    const { result } = renderHook(() => useCollections());
    expect(result.current.featured.length).toBeGreaterThan(0);
    for (const col of result.current.featured) {
      expect(col.featured).toBe(true);
    }
  });
});

describe('useCollection', () => {
  it('returns collection and resolved products for valid slug', () => {
    const { result } = renderHook(() => useCollection('mountain-lodge-living'));
    expect(result.current.collection).toBeDefined();
    expect(result.current.collection!.title).toBe('Mountain Lodge Living');
    expect(result.current.products.length).toBeGreaterThan(0);
  });

  it('returns undefined collection for invalid slug', () => {
    const { result } = renderHook(() => useCollection('nonexistent-slug'));
    expect(result.current.collection).toBeUndefined();
    expect(result.current.products).toEqual([]);
  });

  it('resolves product IDs to full Product objects', () => {
    const { result } = renderHook(() => useCollection('mountain-lodge-living'));
    for (const product of result.current.products) {
      expect(product.id).toBeTruthy();
      expect(product.name).toBeTruthy();
      expect(product.price).toBeGreaterThan(0);
    }
  });
});
