/**
 * @module useProductRecommendations
 *
 * DB-driven product recommendation hook — hq-bzb (schema alignment).
 *
 * Fetches "Recommended for You" products from the Wix `ProductRecommendations`
 * CMS collection, filtered to pairingType='recommended_for_you' and sorted by
 * sortOrder ASC. Resolves product IDs against the local catalog and caps at 8.
 *
 * When Wix is unavailable (no client or network error), falls back to a static
 * catalog filter: same-category products within ±50% price, sorted by relevance.
 *
 * Results are cached in memory for 1 hour per productId.
 *
 * Schema (cm-mmy confirmed):
 *   - productId: string           — the source product
 *   - recommendedProductIds: string  — JSON-encoded string[]
 *   - pairingType: 'recommended_for_you' | ...
 *   - sortOrder: number           — display order (ASC)
 *   - updatedAt: string           — ISO 8601
 */
import { useState, useEffect, useRef } from 'react';
import { PRODUCTS, type Product } from '@/data/products';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { captureException } from '@/services/crashReporting';

/** Cache TTL: 1 hour in milliseconds. */
const CACHE_TTL_MS = 60 * 60 * 1000;

/** Maximum number of recommendations to return. */
const MAX_RESULTS = 8;

const COLLECTION_ID = 'ProductRecommendations';
const PAIRING_TYPE = 'recommended_for_you';

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

interface RecommendationRow {
  productId: string;
  /** JSON-encoded string[] of product IDs. */
  recommendedProductIds: string;
  pairingType: string;
  sortOrder: number;
  updatedAt: string;
}

/**
 * Parse the recommendedProductIds JSON field safely.
 * Returns empty array for any malformed or non-array value.
 */
function parseRecommendedIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

/**
 * Compute a relevance score for a candidate product relative to the source.
 * Used only for the static fallback path.
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
 * Static fallback: filter + sort products from local catalog.
 * Returns same-category products within ±50% price, capped at MAX_RESULTS.
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
 * Returns "Recommended for You" products for a given productId.
 *
 * Queries the Wix ProductRecommendations CMS collection filtered to
 * pairingType='recommended_for_you', sorted by sortOrder ASC. Falls back to
 * a static category/price-based filter when Wix is unavailable.
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
    if (!productId) {
      setRecommendations([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const client = wixClientRef.current;

    // No Wix client — serve static recommendations immediately
    if (!client) {
      const source = PRODUCTS.find((p) => p.id === productId);
      const recs = source ? getStaticRecommendations(source) : [];
      setRecommendations(recs);
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
      try {
        const { items } = await client.queryData<RecommendationRow>(COLLECTION_ID, {
          filter: {
            productId: { $eq: productId },
            pairingType: { $eq: PAIRING_TYPE },
          },
          sort: [{ fieldName: 'sortOrder', order: 'ASC' }],
        });

        // Sort client-side as a defensive measure
        const sorted = [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        // Flatten all recommendedProductIds across rows, resolve against local
        // catalog, cap at MAX_RESULTS.
        const resolved: Product[] = [];
        for (const item of sorted) {
          const ids = parseRecommendedIds(item.recommendedProductIds);
          for (const id of ids) {
            if (resolved.length >= MAX_RESULTS) break;
            const product = PRODUCTS.find((p) => p.id === id);
            if (product) resolved.push(product);
          }
          if (resolved.length >= MAX_RESULTS) break;
        }

        recommendationsCache.set(productId, {
          data: resolved,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });

        if (mountedRef.current) {
          setRecommendations(resolved);
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)));

        // Wix unavailable — fall back to static catalog
        const source = PRODUCTS.find((p) => p.id === productId);
        const recs = source ? getStaticRecommendations(source) : [];

        recommendationsCache.set(productId, {
          data: recs,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });

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
