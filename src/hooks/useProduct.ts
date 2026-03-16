/**
 * @module useProduct
 *
 * Single-product data hook for the Product Detail Page (PDP). When Wix is
 * configured, fetches product data from the Wix Stores REST API. Otherwise
 * falls back to static mock data.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { PRODUCTS, type Product } from '@/data/products';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { isWixConfigured } from '@/services/wix/config';
import { captureException } from '@/services/crashReporting';

interface UseProductReturn {
  product: Product | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Fetch a single product by ID.
 *
 * Falls back to static PRODUCTS data when Wix is not configured.
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

/**
 * Fetch a single product by slug. When Wix is configured, queries the
 * Wix Stores API by slug. Falls back to matching against static PRODUCTS.
 */
export function useProductBySlug(slug: string): UseProductReturn {
  const wixClient = useOptionalWixClient();
  const useWix = isWixConfigured() && wixClient !== null;

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(!!slug);
  const [error, setError] = useState<Error | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!slug) {
      setProduct(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Try static lookup first (works for both Wix and mock slugs)
    const staticMatch = PRODUCTS.find((p) => p.slug === slug) ?? null;
    if (staticMatch) {
      setProduct(staticMatch);
      setIsLoading(false);
      setError(null);
      return;
    }

    // If not found locally and Wix is available, fetch from API
    if (!useWix || !wixClient) {
      setProduct(null);
      setIsLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    wixClient
      .getProductBySlug(slug)
      .then((fetched) => {
        if (controller.signal.aborted) return;
        setProduct(fetched);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        captureException(e, 'error', { action: 'wix-product-by-slug', slug });
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [slug, useWix, wixClient, refreshToken]);

  const refresh = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  return { product, isLoading, error, refresh };
}
