/**
 * @module useProductRecommendations
 *
 * DB-driven product recommendation hook — cm-cm1 (Phase 2.2).
 *
 * Fetches related products by querying Wix CMS (or falling back to the
 * static PRODUCTS catalog) filtered by same category and ±50% price range,
 * then sorted by relevance score (category + fabric overlap + price proximity).
 *
 * Results are cached in memory for 5 minutes per productId.
 */
import { useState, useEffect, useRef } from 'react';
import { PRODUCTS, type Product } from '@/data/products';
import { useOptionalWixClient } from '@/services/wix/wixProvider';

/** Cache TTL: 5 minutes in milliseconds. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Maximum number of recommendations to return. */
const MAX_RESULTS = 8;

interface CacheEntry {
  data: Product[];
  expiresAt: number;
}

/** Module-level cache keyed by productId. Cleared between tests via clearRecommendationsCache(). */
const recommendationsCache = new Map<string, CacheEntry>();

/** Clears the in-memory cache. Intended for use in tests. */
export function clearRecommendationsCache(): void {
  recommendationsCache.clear();
}

/** Shape of the value returned by useProductRecommendations. */
export interface ProductRecommendationsResult {
  recommendations: Product[];
  isLoading: boolean;
  /** Non-null when Wix failed and results are from static fallback. */
  error: string | null;
}

/**
 * Compute a relevance score for a candidate product relative to the source.
 * Higher score = more relevant.
 *
 * Scoring:
 *  +10  same category
 *  +1   per overlapping fabric option
 *  +3   price within ±20%
 *  +1   price within ±50%
 */
function relevanceScore(source: Product, candidate: Product): number {
  let score = 0;
  if (candidate.category === source.category) score += 10;
  const sourceFabrics = new Set(source.fabricOptions);
  for (const fabric of candidate.fabricOptions) {
    if (sourceFabrics.has(fabric)) score += 1;
  }
  const priceDiff = Math.abs(candidate.price - source.price) / source.price;
  if (priceDiff <= 0.2) score += 3;
  else if (priceDiff <= 0.5) score += 1;
  return score;
}

/**
 * Filter and sort products relative to source using static PRODUCTS catalog.
 * Returns up to MAX_RESULTS products in the same category within ±50% price.
 */
function getStaticRecommendations(source: Product): Product[] {
  const minPrice = source.price * 0.5;
  const maxPrice = source.price * 1.5;
  return PRODUCTS.filter(
    (p) =>
      p.id !== source.id &&
      p.category === source.category &&
      p.price >= minPrice &&
      p.price <= maxPrice,
  )
    .sort((a, b) => relevanceScore(source, b) - relevanceScore(source, a))
    .slice(0, MAX_RESULTS);
}

/**
 * Fetches product recommendations for a given product.
 *
 * Queries Wix CMS when a WixClient is available; falls back to the static
 * PRODUCTS array on failure or when offline. Results are cached for 5 minutes.
 *
 * @param productId - The ID of the product to fetch recommendations for.
 * @returns { recommendations, isLoading, error }
 *
 * @example
 * const { recommendations, isLoading } = useProductRecommendations(product.id);
 */
export function useProductRecommendations(productId: string): ProductRecommendationsResult {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const wixClient = useOptionalWixClient();
  const wixClientRef = useRef(wixClient);
  wixClientRef.current = wixClient;

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const source = PRODUCTS.find((p) => p.id === productId);

    if (!source) {
      setRecommendations([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Serve from cache if still valid
    const cached = recommendationsCache.get(productId);
    if (cached && Date.now() < cached.expiresAt) {
      setRecommendations(cached.data);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    (async () => {
      const client = wixClientRef.current;
      try {
        let recs: Product[];
        if (client) {
          const minPrice = source.price * 0.5;
          const maxPrice = source.price * 1.5;
          const { products: wixProducts } = await client.queryProducts({ limit: 100 });
          recs = wixProducts
            .filter(
              (p) =>
                p.id !== source.id &&
                p.category === source.category &&
                p.price >= minPrice &&
                p.price <= maxPrice,
            )
            .sort((a, b) => relevanceScore(source, b) - relevanceScore(source, a))
            .slice(0, MAX_RESULTS);
        } else {
          recs = getStaticRecommendations(source);
        }

        recommendationsCache.set(productId, { data: recs, expiresAt: Date.now() + CACHE_TTL_MS });

        if (mountedRef.current) {
          setRecommendations(recs);
          setIsLoading(false);
          setError(null);
        }
      } catch {
        // Wix unavailable — fall back to static catalog
        const recs = getStaticRecommendations(source);
        recommendationsCache.set(productId, { data: recs, expiresAt: Date.now() + CACHE_TTL_MS });
        if (mountedRef.current) {
          setRecommendations(recs);
          setIsLoading(false);
          setError('[useProductRecommendations] Wix fetch failed — showing local recommendations');
        }
      }
    })();
    // wixClient intentionally omitted — accessed via ref to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  return { recommendations, isLoading, error };
}
