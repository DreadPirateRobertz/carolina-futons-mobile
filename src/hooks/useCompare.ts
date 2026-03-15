import { useState, useCallback } from 'react';
import type { Product } from '@/data/products';
import { MAX_COMPARE_ITEMS } from '@/screens/CompareScreen';

export interface UseCompareReturn {
  compareList: Product[];
  addToCompare: (product: Product) => boolean;
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;
  isInCompare: (productId: string) => boolean;
  isFull: boolean;
  count: number;
}

export function useCompare(): UseCompareReturn {
  const [compareList, setCompareList] = useState<Product[]>([]);

  const addToCompare = useCallback(
    (product: Product): boolean => {
      let added = false;
      setCompareList((prev) => {
        if (prev.length >= MAX_COMPARE_ITEMS) return prev;
        if (prev.some((p) => p.id === product.id)) return prev;
        added = true;
        return [...prev, product];
      });
      return added;
    },
    [],
  );

  const removeFromCompare = useCallback((productId: string) => {
    setCompareList((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareList([]);
  }, []);

  const isInCompare = useCallback(
    (productId: string) => compareList.some((p) => p.id === productId),
    [compareList],
  );

  return {
    compareList,
    addToCompare,
    removeFromCompare,
    clearCompare,
    isInCompare,
    isFull: compareList.length >= MAX_COMPARE_ITEMS,
    count: compareList.length,
  };
}
