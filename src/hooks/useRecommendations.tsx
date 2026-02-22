import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { PRODUCTS, Product } from '@/data/products';

const MAX_RECENT = 20;

interface RecommendationsState {
  viewedIds: string[];
  purchasedIds: string[];
}

interface RecommendationsContextValue {
  recentlyViewed: Product[];
  similarItems: Product[];
  alsoBoought: Product[];
  recommendedForYou: Product[];
  trackView: (productId: string) => void;
  trackPurchase: (productId: string) => void;
  clearHistory: () => void;
}

const RecommendationsContext = createContext<RecommendationsContextValue | null>(null);

const productById = new Map(PRODUCTS.map((p) => [p.id, p]));

export function RecommendationsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RecommendationsState>({
    viewedIds: [],
    purchasedIds: [],
  });

  const trackView = useCallback((productId: string) => {
    setState((prev) => {
      const filtered = prev.viewedIds.filter((id) => id !== productId);
      const next = [productId, ...filtered].slice(0, MAX_RECENT);
      return { ...prev, viewedIds: next };
    });
  }, []);

  const trackPurchase = useCallback((productId: string) => {
    setState((prev) => {
      if (prev.purchasedIds.includes(productId)) return prev;
      return { ...prev, purchasedIds: [...prev.purchasedIds, productId] };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setState({ viewedIds: [], purchasedIds: [] });
  }, []);

  const recentlyViewed = useMemo(
    () => state.viewedIds.map((id) => productById.get(id)).filter((p): p is Product => p != null),
    [state.viewedIds],
  );

  const similarItems = useMemo(() => {
    if (state.viewedIds.length === 0) return [];
    const lastViewedId = state.viewedIds[0];
    const lastViewed = productById.get(lastViewedId);
    if (!lastViewed) return [];
    return PRODUCTS.filter((p) => p.category === lastViewed.category && p.id !== lastViewedId);
  }, [state.viewedIds]);

  const alsoBoought = useMemo(() => {
    if (state.purchasedIds.length === 0) return [];
    const purchasedCategories = new Set(
      state.purchasedIds
        .map((id) => productById.get(id))
        .filter((p): p is Product => p != null)
        .map((p) => p.category),
    );
    return PRODUCTS.filter(
      (p) => purchasedCategories.has(p.category) && !state.purchasedIds.includes(p.id),
    );
  }, [state.purchasedIds]);

  const recommendedForYou = useMemo(() => {
    return PRODUCTS.filter(
      (p) => !state.viewedIds.includes(p.id) && !state.purchasedIds.includes(p.id),
    ).slice(0, 8);
  }, [state.viewedIds, state.purchasedIds]);

  const value = useMemo<RecommendationsContextValue>(
    () => ({
      recentlyViewed,
      similarItems,
      alsoBoought,
      recommendedForYou,
      trackView,
      trackPurchase,
      clearHistory,
    }),
    [
      recentlyViewed,
      similarItems,
      alsoBoought,
      recommendedForYou,
      trackView,
      trackPurchase,
      clearHistory,
    ],
  );

  return (
    <RecommendationsContext.Provider value={value}>{children}</RecommendationsContext.Provider>
  );
}

export function useRecommendations() {
  const ctx = useContext(RecommendationsContext);
  if (!ctx) throw new Error('useRecommendations must be used within a RecommendationsProvider');
  return ctx;
}
