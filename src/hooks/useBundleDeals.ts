/**
 * @module useBundleDeals
 *
 * Fetches "Pairs Well With" bundle deal products from the Wix Data
 * `BundleDeals` collection for a given product ID. Returns the matched
 * Product catalog entries so they can be rendered as a horizontal
 * scroll row on the Product Detail Screen.
 *
 * Returns an empty array when no Wix client is available (unauthenticated)
 * or when the product has no configured bundle deals.
 */

import { useState, useEffect } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { PRODUCTS, type Product } from '@/data/products';

const COLLECTION_ID = 'BundleDeals';

interface RawBundleData {
  productId?: string;
  relatedProductIds?: string[];
}

export interface UseBundleDealsReturn {
  bundleProducts: Product[];
  isLoading: boolean;
  error: Error | null;
}

export function useBundleDeals(productId: string): UseBundleDealsReturn {
  const wixClient = useOptionalWixClient();
  const [bundleProducts, setBundleProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBundles() {
      setIsLoading(true);
      setError(null);

      if (!productId) {
        if (!cancelled) {
          setBundleProducts([]);
          setIsLoading(false);
        }
        return;
      }

      if (!wixClient) {
        if (!cancelled) {
          setBundleProducts([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        const { items } = await wixClient.queryData<RawBundleData>(COLLECTION_ID, {
          filter: { productId: { $eq: productId } },
          limit: 1,
        });

        if (!cancelled) {
          const relatedIds = items[0]?.relatedProductIds ?? [];
          const products = relatedIds
            .map((id) => PRODUCTS.find((p) => p.id === id))
            .filter((p): p is Product => p !== undefined);
          setBundleProducts(products);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load bundle deals'));
          setBundleProducts([]);
          setIsLoading(false);
        }
      }
    }

    fetchBundles();

    return () => {
      cancelled = true;
    };
  }, [wixClient, productId]);

  return { bundleProducts, isLoading, error };
}
