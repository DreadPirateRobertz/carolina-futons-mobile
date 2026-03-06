/**
 * React context provider for WixClient.
 *
 * Wraps the app to provide a shared WixClient instance and
 * convenience hooks for product/collection data fetching.
 */

import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { WixClient, WixApiError, type WixCollectionInfo } from './wixClient';
import type { Product } from '@/data/products';

// ── Context ────────────────────────────────────────────────────

const WixContext = createContext<WixClient | null>(null);

// ── Provider ───────────────────────────────────────────────────

interface WixProviderProps {
  apiKey: string;
  siteId: string;
  baseUrl?: string;
  children: React.ReactNode;
}

/** Provides a memoized WixClient instance to the component tree via React context. */
export function WixProvider({ apiKey, siteId, baseUrl, children }: WixProviderProps) {
  const client = useMemo(
    () => new WixClient({ apiKey, siteId, baseUrl }),
    [apiKey, siteId, baseUrl],
  );

  return <WixContext.Provider value={client}>{children}</WixContext.Provider>;
}

// ── Hooks ──────────────────────────────────────────────────────

/** Access the WixClient from context. Throws if used outside a WixProvider. */
export function useWixClient(): WixClient {
  const client = useContext(WixContext);
  if (!client) {
    throw new Error('useWixClient must be used within a WixProvider');
  }
  return client;
}

/** Fetch products from Wix, optionally filtered by collection. Auto-fetches on mount. */
export function useWixProducts(collectionId?: string): {
  products: Product[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const client = useWixClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await client.queryProducts({
        limit: 100,
        collectionId,
      });
      setProducts(result.products);
    } catch (err) {
      const message =
        err instanceof WixApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unknown error fetching products';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [client, collectionId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refresh: fetchProducts };
}

/** Fetch all product collections from Wix. Auto-fetches on mount. */
export function useWixCollections(): {
  collections: WixCollectionInfo[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const client = useWixClient();
  const [collections, setCollections] = useState<WixCollectionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await client.queryCollections({ limit: 100 });
      setCollections(result.collections);
    } catch (err) {
      const message =
        err instanceof WixApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unknown error fetching collections';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  return { collections, loading, error, refresh: fetchCollections };
}
