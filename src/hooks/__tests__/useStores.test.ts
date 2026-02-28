import { renderHook } from '@testing-library/react-native';
import { useStores, useStoreById } from '../useStores';
import { STORES } from '@/data/stores';

describe('useStores', () => {
  it('returns all stores', () => {
    const { result } = renderHook(() => useStores());
    expect(result.current.stores).toEqual(STORES);
  });

  it('returns isLoading as false (static data)', () => {
    const { result } = renderHook(() => useStores());
    expect(result.current.isLoading).toBe(false);
  });

  it('returns error as null', () => {
    const { result } = renderHook(() => useStores());
    expect(result.current.error).toBeNull();
  });

  it('provides getStoreById that finds a store', () => {
    const { result } = renderHook(() => useStores());
    const store = result.current.getStoreById('store-asheville');
    expect(store).toBeDefined();
    expect(store?.name).toBe('Carolina Futons — Asheville');
  });

  it('getStoreById returns undefined for unknown id', () => {
    const { result } = renderHook(() => useStores());
    expect(result.current.getStoreById('nonexistent')).toBeUndefined();
  });

  it('returns stable references across re-renders', () => {
    const { result, rerender } = renderHook(() => useStores());
    const first = result.current;
    rerender({});
    expect(result.current.stores).toBe(first.stores);
    expect(result.current.getStoreById).toBe(first.getStoreById);
  });
});

describe('useStoreById', () => {
  it('returns matching store', () => {
    const { result } = renderHook(() => useStoreById('store-charlotte'));
    expect(result.current.store).toBeDefined();
    expect(result.current.store?.city).toBe('Charlotte');
  });

  it('returns null for unknown store id', () => {
    const { result } = renderHook(() => useStoreById('bad-id'));
    expect(result.current.store).toBeNull();
  });

  it('returns null when id is undefined', () => {
    const { result } = renderHook(() => useStoreById(undefined));
    expect(result.current.store).toBeNull();
  });

  it('returns isLoading false and error null', () => {
    const { result } = renderHook(() => useStoreById('store-asheville'));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
