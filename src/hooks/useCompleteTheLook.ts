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
 * Results are capped at 4 products to fit the horizontal strip AC.
 * Falls back to empty array (non-fatal) when Wix is unavailable.
 *
 * cm-3n3: Complete the look — complementary product recommendations on PDP.
 */

import { useState, useEffect, useRef } from 'react';
import { PRODUCTS, type Product } from '@/data/products';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { captureException } from '@/services/crashReporting';

const MAX_RESULTS = 4;
const COLLECTION_ID = 'ProductRecommendations';

export interface CompleteTheLookResult {
  products: Product[];
  isLoading: boolean;
  /** Non-null when Wix fetch failed — strip is hidden (non-fatal). */
  error: string | null;
}

/**
 * Returns curated complementary products for a given productId.
 * Queries the Wix ProductRecommendations CMS collection.
 * Returns empty array when Wix is unavailable or no recommendations exist.
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
        const { items } = await client.queryData<{
          productId: string;
          recommendedProductId: string;
          position?: number;
        }>(COLLECTION_ID, {
          filter: { productId: { $eq: productId } },
          sort: [{ fieldName: 'position', order: 'ASC' }],
          limit: MAX_RESULTS,
        });

        // Resolve each recommendedProductId against the local catalog
        const resolved: Product[] = [];
        for (const item of items) {
          const product = PRODUCTS.find((p) => p.id === item.data.recommendedProductId);
          if (product) resolved.push(product);
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
