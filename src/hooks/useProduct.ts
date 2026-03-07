/**
 * @module useProduct
 *
 * Single-product data hook for the Product Detail Page (PDP). Performs a
 * synchronous lookup against static data today; the loading/error states
 * are pre-wired for an async API call later.
 */
import { useState, useEffect, useCallback } from 'react';
import { PRODUCTS, type Product } from '@/data/products';
import { getWixClientInstance } from '@/services/wix/singleton';

interface UseProductReturn {
  product: Product | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

function findMockProduct(id: string): Product | null {
  return PRODUCTS.find((p) => p.id === id) ?? null;
}

/**
 * Fetch a single product by ID.
 * Tries Wix API first, falls back to static PRODUCTS data.
 */
export function useProduct(productId: string): UseProductReturn {
  const client = getWixClientInstance();

  const [product, setProduct] = useState<Product | null>(() =>
    productId ? findMockProduct(productId) : null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!client) {
      // Synchronous mock fallback
      setProduct(findMockProduct(productId));
      setIsLoading(false);
      setError(null);
      return;
    }

    // Async API fetch
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const found = await client.getProduct(productId);
        if (!cancelled) {
          setProduct(found);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setProduct(findMockProduct(productId));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, client]);

  const refresh = useCallback(() => {
    if (!productId) return;

    if (!client) {
      setProduct(findMockProduct(productId));
      return;
    }

    setIsLoading(true);
    setError(null);
    (async () => {
      try {
        const found = await client.getProduct(productId);
        setProduct(found);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setProduct(findMockProduct(productId));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [productId, client]);

  return { product, isLoading, error, refresh };
}
