// TDD: Implementation pending (cm-ww8)
// Placeholder to satisfy imports — tests will fail until implemented
import React, { createContext, useContext } from 'react';

const ReviewsContext = createContext<any>(null);

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  return <ReviewsContext.Provider value={{}}>{children}</ReviewsContext.Provider>;
}

export function useReviews(_productId?: string) {
  const ctx = useContext(ReviewsContext);
  if (!ctx) throw new Error('useReviews must be used within a ReviewsProvider');
  return ctx;
}
