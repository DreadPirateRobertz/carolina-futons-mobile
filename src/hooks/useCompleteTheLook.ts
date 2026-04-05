/**
 * @module useCompleteTheLook
 *
 * Fetches curated "Complete the Look" complementary product recommendations
 * for a given productId from the Wix `ProductRecommendations` CMS collection.
 *
 * Unlike `useProductRecommendations` (which uses category/price matching),
 * this hook returns editorially curated pairings — e.g. sofa + pillows,
 * frame + mattress — stored in the CMS by the merchandising team.
 *
 * Schema (cm-mmy):
 *   - productId: string         — the source product
 *   - recommendedProductIds: string  — JSON-encoded string[]
 *   - pairingType: 'complete_the_look' | 'bundle' | 'style_match'
 *   - sortOrder: number         — display order (ASC)
 *   - updatedAt: string         — ISO 8601
 *
 * This hook filters pairingType === 'complete_the_look', parses the JSON
 * array, resolves against the local product catalog, and caps at 4 results.
 *
 * Falls back to empty array (non-fatal) when Wix is unavailable.
 *
 * cm-3n3: Complete the look — complementary product recommendations on PDP.
 * cm-mmy: Updated to official ProductRecommendations schema.
 */

import { useState, useEffect, useRef } from 'react';
import { PRODUCTS, type Product } from '@/data/products';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { captureException } from '@/services/crashReporting';

const MAX_RESULTS = 4;
const COLLECTION_ID = 'ProductRecommendations';
const PAIRING_TYPE = 'complete_the_look';

export interface CompleteTheLookResult {
  products: Product[];
  isLoading: boolean;
  /** Non-null when Wix fetch failed — strip is hidden (non-fatal). */
  error: string | null;
}

interface RecommendationRow {
  productId: string;
  recommendedProductIds: string; // JSON-encoded string[]
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
 * Returns curated complementary products for a given productId.
 * Queries the Wix ProductRecommendations CMS collection filtered to
 * pairingType=complete_the_look, sorted by sortOrder ASC.
 */
export function useCompleteTheLook(productId: string): CompleteTheLookResult {
  const [products, setProducts] = useState<Product[]>([]);
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
      setProducts([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const client = wixClientRef.current;
    if (!client) {
      setProducts([]);
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

        // Sort rows by sortOrder ASC client-side as a defensive measure
        // (Wix sort is requested but not guaranteed by the mock in tests).
        const sorted = [...items].sort(
          (a, b) => (a.data.sortOrder ?? 0) - (b.data.sortOrder ?? 0),
        );

        // Flatten all recommendedProductIds across rows, resolve against local
        // catalog, cap at MAX_RESULTS.
        const resolved: Product[] = [];
        for (const item of sorted) {
          const ids = parseRecommendedIds(item.data.recommendedProductIds);
          for (const id of ids) {
            if (resolved.length >= MAX_RESULTS) break;
            const product = PRODUCTS.find((p) => p.id === id);
            if (product) resolved.push(product);
          }
          if (resolved.length >= MAX_RESULTS) break;
        }

        if (mountedRef.current) {
          setProducts(resolved);
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)));
        if (mountedRef.current) {
          setProducts([]);
          setIsLoading(false);
          setError('[useCompleteTheLook] Failed to fetch recommendations');
        }
      }
    })();
    // wixClient accessed via ref — intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  return { products, isLoading, error };
}
