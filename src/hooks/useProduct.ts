import { useState, useEffect, useCallback } from 'react';
import { PRODUCTS, type Product } from '@/data/products';

interface UseProductReturn {
  product: Product | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Fetch a single product by ID.
 *
 * Currently falls back to static PRODUCTS data.
 * When WixProvider is available, will fetch from Wix Stores API.
 */
export function useProduct(productId: string): UseProductReturn {
  const [product, setProduct] = useState<Product | null>(() =>
    productId ? (PRODUCTS.find((p) => p.id === productId) ?? null) : null,
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

    // Static fallback — synchronous lookup
    const found = PRODUCTS.find((p) => p.id === productId) ?? null;
    setProduct(found);
    setIsLoading(false);
    setError(null);
  }, [productId]);

  const refresh = useCallback(() => {
    if (!productId) return;
    const found = PRODUCTS.find((p) => p.id === productId) ?? null;
    setProduct(found);
  }, [productId]);

  return { product, isLoading, error, refresh };
}
