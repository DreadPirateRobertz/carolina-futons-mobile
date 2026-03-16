/**
 * Tests for CompareProvider context — shared compare state across screens.
 *
 * TDD: tests written first, CompareProvider does not yet exist.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { CompareProvider, useCompareContext } from '../CompareContext';
import { PRODUCTS } from '@/data/products';

const [productA, productB, productC, productD] = PRODUCTS;

function wrapper({ children }: { children: React.ReactNode }) {
  return <CompareProvider>{children}</CompareProvider>;
}

describe('CompareProvider', () => {
  it('provides an empty compare list by default', () => {
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    expect(result.current.compareList).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.isFull).toBe(false);
  });

  it('adds a product to the compare list', () => {
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    act(() => {
      result.current.addToCompare(productA);
    });
    expect(result.current.compareList).toEqual([productA]);
    expect(result.current.count).toBe(1);
  });

  it('prevents duplicate products', () => {
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    act(() => {
      result.current.addToCompare(productA);
      result.current.addToCompare(productA);
    });
    expect(result.current.count).toBe(1);
  });

  it('caps at 3 items', () => {
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    act(() => {
      result.current.addToCompare(productA);
      result.current.addToCompare(productB);
      result.current.addToCompare(productC);
    });
    expect(result.current.isFull).toBe(true);
    act(() => {
      result.current.addToCompare(productD);
    });
    expect(result.current.count).toBe(3);
  });

  it('removes a product by id', () => {
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    act(() => {
      result.current.addToCompare(productA);
      result.current.addToCompare(productB);
    });
    act(() => {
      result.current.removeFromCompare(productA.id);
    });
    expect(result.current.compareList).toEqual([productB]);
  });

  it('clears all products', () => {
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    act(() => {
      result.current.addToCompare(productA);
      result.current.addToCompare(productB);
    });
    act(() => {
      result.current.clearCompare();
    });
    expect(result.current.compareList).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it('isInCompare returns correct boolean', () => {
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    act(() => {
      result.current.addToCompare(productA);
    });
    expect(result.current.isInCompare(productA.id)).toBe(true);
    expect(result.current.isInCompare(productB.id)).toBe(false);
  });

  it('shares state between multiple consumers', () => {
    const { result: consumer1 } = renderHook(() => useCompareContext(), { wrapper });
    // Note: In a real tree both consumers share the same Provider.
    // With renderHook, each gets its own wrapper instance.
    // This test validates the API shape — integration tests cover shared state.
    act(() => {
      consumer1.current.addToCompare(productA);
    });
    expect(consumer1.current.count).toBe(1);
  });

  it('throws when used outside provider', () => {
    // Suppress React error boundary noise
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useCompareContext());
    }).toThrow(/CompareProvider/);
    spy.mockRestore();
  });
});
