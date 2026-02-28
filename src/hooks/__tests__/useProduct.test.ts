import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useProduct } from '../useProduct';
import { PRODUCTS } from '@/data/products';

describe('useProduct', () => {
  const knownProduct = PRODUCTS[0];
  const knownId = knownProduct.id;

  // --- Happy path ---

  it('returns a product by ID', () => {
    const { result } = renderHook(() => useProduct(knownId));
    expect(result.current.product).toEqual(knownProduct);
  });

  it('returns isLoading=false when using static fallback', () => {
    const { result } = renderHook(() => useProduct(knownId));
    expect(result.current.isLoading).toBe(false);
  });

  it('returns error=null on success', () => {
    const { result } = renderHook(() => useProduct(knownId));
    expect(result.current.error).toBeNull();
  });

  // --- Not found ---

  it('returns product=null for unknown ID', () => {
    const { result } = renderHook(() => useProduct('nonexistent-product-id'));
    expect(result.current.product).toBeNull();
  });

  it('returns isLoading=false for unknown ID', () => {
    const { result } = renderHook(() => useProduct('nonexistent-product-id'));
    expect(result.current.isLoading).toBe(false);
  });

  it('returns error=null for unknown ID (not-found is not an error)', () => {
    const { result } = renderHook(() => useProduct('nonexistent-product-id'));
    expect(result.current.error).toBeNull();
  });

  // --- Edge cases ---

  it('returns product=null for empty string ID', () => {
    const { result } = renderHook(() => useProduct(''));
    expect(result.current.product).toBeNull();
  });

  it('updates product when ID changes', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useProduct(id),
      { initialProps: { id: PRODUCTS[0].id } },
    );
    expect(result.current.product?.id).toBe(PRODUCTS[0].id);

    rerender({ id: PRODUCTS[1].id });
    expect(result.current.product?.id).toBe(PRODUCTS[1].id);
  });

  it('handles rapid ID changes without stale data', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useProduct(id),
      { initialProps: { id: PRODUCTS[0].id } },
    );

    // Rapid changes
    rerender({ id: PRODUCTS[1].id });
    rerender({ id: PRODUCTS[2].id });
    rerender({ id: PRODUCTS[0].id });

    expect(result.current.product?.id).toBe(PRODUCTS[0].id);
  });

  // --- Return shape ---

  it('returns a refresh function', () => {
    const { result } = renderHook(() => useProduct(knownId));
    expect(typeof result.current.refresh).toBe('function');
  });

  it('refresh does not throw', () => {
    const { result } = renderHook(() => useProduct(knownId));
    expect(() => result.current.refresh()).not.toThrow();
  });

  // --- Boundary conditions ---

  it('finds every product in the catalog by ID', () => {
    for (const expected of PRODUCTS) {
      const { result } = renderHook(() => useProduct(expected.id));
      expect(result.current.product).toEqual(expected);
    }
  });

  it('returns complete product shape with all required fields', () => {
    const { result } = renderHook(() => useProduct(knownId));
    const p = result.current.product!;
    expect(p.id).toBeDefined();
    expect(p.name).toBeDefined();
    expect(p.slug).toBeDefined();
    expect(p.category).toBeDefined();
    expect(typeof p.price).toBe('number');
    expect(p.images.length).toBeGreaterThan(0);
    expect(typeof p.rating).toBe('number');
    expect(typeof p.inStock).toBe('boolean');
    expect(p.dimensions).toHaveProperty('width');
    expect(p.dimensions).toHaveProperty('depth');
    expect(p.dimensions).toHaveProperty('height');
  });

  it('handles ID with special characters gracefully', () => {
    const { result } = renderHook(() => useProduct('prod-<script>alert(1)</script>'));
    expect(result.current.product).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('handles whitespace-only ID', () => {
    const { result } = renderHook(() => useProduct('   '));
    expect(result.current.product).toBeNull();
  });

  it('refresh after rerender returns correct product', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useProduct(id),
      { initialProps: { id: PRODUCTS[0].id } },
    );
    rerender({ id: PRODUCTS[1].id });
    result.current.refresh();
    expect(result.current.product?.id).toBe(PRODUCTS[1].id);
  });
});
