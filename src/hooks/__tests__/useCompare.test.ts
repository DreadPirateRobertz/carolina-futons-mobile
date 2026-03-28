import { renderHook, act } from '@testing-library/react-native';
import { useCompare } from '../useCompare';
import { PRODUCTS } from '@/data/products';

const [productA, productB, productC, productD] = PRODUCTS;

describe('useCompare', () => {
  it('starts with empty list', () => {
    const { result } = renderHook(() => useCompare());
    expect(result.current.compareList).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.isFull).toBe(false);
  });

  it('adds a product to compare list', async () => {
    const { result } = renderHook(() => useCompare());
    await act(async () => {
      result.current.addToCompare(productA);
    });
    expect(result.current.compareList).toEqual([productA]);
    expect(result.current.count).toBe(1);
  });

  it('prevents duplicate products', async () => {
    const { result } = renderHook(() => useCompare());
    await act(async () => {
      result.current.addToCompare(productA);
      result.current.addToCompare(productA);
    });
    expect(result.current.count).toBe(1);
  });

  it('caps at MAX_COMPARE_ITEMS (3)', async () => {
    const { result } = renderHook(() => useCompare());
    await act(async () => {
      result.current.addToCompare(productA);
      result.current.addToCompare(productB);
      result.current.addToCompare(productC);
    });
    expect(result.current.isFull).toBe(true);
    await act(async () => {
      result.current.addToCompare(productD);
    });
    expect(result.current.count).toBe(3);
  });

  it('removes a product by id', async () => {
    const { result } = renderHook(() => useCompare());
    await act(async () => {
      result.current.addToCompare(productA);
      result.current.addToCompare(productB);
    });
    await act(async () => {
      result.current.removeFromCompare(productA.id);
    });
    expect(result.current.compareList).toEqual([productB]);
    expect(result.current.count).toBe(1);
  });

  it('clears all products', async () => {
    const { result } = renderHook(() => useCompare());
    await act(async () => {
      result.current.addToCompare(productA);
      result.current.addToCompare(productB);
    });
    await act(async () => {
      result.current.clearCompare();
    });
    expect(result.current.compareList).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.isFull).toBe(false);
  });

  it('isInCompare returns correct boolean', async () => {
    const { result } = renderHook(() => useCompare());
    await act(async () => {
      result.current.addToCompare(productA);
    });
    expect(result.current.isInCompare(productA.id)).toBe(true);
    expect(result.current.isInCompare(productB.id)).toBe(false);
  });

  it('removing non-existent product is a no-op', async () => {
    const { result } = renderHook(() => useCompare());
    await act(async () => {
      result.current.addToCompare(productA);
    });
    await act(async () => {
      result.current.removeFromCompare('nonexistent');
    });
    expect(result.current.count).toBe(1);
  });
});
