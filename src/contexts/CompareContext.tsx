/**
 * CompareContext — shared compare-list state across screens.
 *
 * Wraps the useCompare hook in a React Context so that ProductDetailScreen,
 * ShopScreen, and CompareFAB can all read/write the same compare list.
 */
import React, { createContext, useContext } from 'react';
import { useCompare, type UseCompareReturn } from '@/hooks/useCompare';

const CompareContext = createContext<UseCompareReturn | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const compare = useCompare();
  return <CompareContext.Provider value={compare}>{children}</CompareContext.Provider>;
}

export function useCompareContext(): UseCompareReturn {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error('useCompareContext must be used within a CompareProvider');
  }
  return ctx;
}
