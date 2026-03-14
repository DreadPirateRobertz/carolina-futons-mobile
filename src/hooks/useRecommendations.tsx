/**
 * Product recommendation engine hook and context provider.
 *
 * Tracks user browsing and purchase history to generate four recommendation
 * lists: recently viewed, similar items (same category as last viewed),
 * "also bought" (same category as past purchases), and a general
 * "recommended for you" set of unseen products.
 *
 * All data is in-memory for now; designed for a backend recommendation
 * service swap-in later.
 *
 * @module useRecommendations
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { PRODUCTS, Product } from '@/data/products';
import type { ProductId } from '@/data/productId';

/** Maximum number of recently-viewed product IDs to retain. */
const MAX_RECENT = 20;

/** Internal tracking state for view and purchase history. */
interface RecommendationsState {
  viewedIds: string[];
  purchasedIds: string[];
}

/** Shape of the value exposed by RecommendationsContext to consumers. */
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

/**
 * Context provider that tracks product views and purchases to power
 * recommendation lists throughout the app.
 *
 * @param props.children - Child components that may consume recommendations context.
 *
 * @example
 * <RecommendationsProvider>
 *   <App />
 * </RecommendationsProvider>
 */
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
    () =>
      state.viewedIds
        .map((id) => productById.get(id as ProductId))
        .filter((p): p is Product => p != null),
    [state.viewedIds],
  );

  const similarItems = useMemo(() => {
    if (state.viewedIds.length === 0) return [];
    const lastViewedId = state.viewedIds[0];
    const lastViewed = productById.get(lastViewedId as ProductId);
    if (!lastViewed) return [];
    return PRODUCTS.filter(
      (p) => p.category === lastViewed.category && (p.id as string) !== lastViewedId,
    );
  }, [state.viewedIds]);

  const alsoBoought = useMemo(() => {
    if (state.purchasedIds.length === 0) return [];
    const purchasedCategories = new Set(
      state.purchasedIds
        .map((id) => productById.get(id as ProductId))
        .filter((p): p is Product => p != null)
        .map((p) => p.category),
    );
    return PRODUCTS.filter(
      (p) => purchasedCategories.has(p.category) && !state.purchasedIds.includes(p.id as string),
    );
  }, [state.purchasedIds]);

  const recommendedForYou = useMemo(() => {
    return PRODUCTS.filter(
      (p) =>
        !state.viewedIds.includes(p.id as string) && !state.purchasedIds.includes(p.id as string),
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

/**
 * Accesses product recommendation lists and tracking actions.
 *
 * Must be called from within a `RecommendationsProvider`.
 *
 * @returns Object containing `{ recentlyViewed, similarItems, alsoBoought, recommendedForYou, trackView, trackPurchase, clearHistory }`
 *
 * @example
 * const { recentlyViewed, trackView } = useRecommendations();
 */
export function useRecommendations() {
  const ctx = useContext(RecommendationsContext);
  if (!ctx) throw new Error('useRecommendations must be used within a RecommendationsProvider');
  return ctx;
}
