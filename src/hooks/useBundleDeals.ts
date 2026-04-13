/**
 * @module useBundleDeals
 *
 * Fetches bundle promotions from the shared Wix `BundleDeals` CMS collection.
 * Schema (confirmed with melania, shared with cfutons web — cm-6i5):
 *   name:         string  — bundle display name
 *   products:     string[] (or JSON-encoded string) — array of product SKUs
 *   discountCode: string  — pre-configured promo/coupon code
 *   price:        number  — fixed bundle price in dollars
 *
 * Usage:
 *   useBundleDeals()         — fetches all bundles (ShopScreen promotions rail)
 *   useBundleDeals(sku)      — fetches bundles containing that SKU (PDP)
 *
 * Returns an empty array (no error) when no wixClient is available.
 * SKUs are resolved against the local product catalog; unknown SKUs are silently
 * skipped and don't count against a bundle's validity.
 */

import { useState, useEffect } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { PRODUCTS, type Product } from '@/data/products';

const COLLECTION_ID = 'BundleDeals';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawBundleDeal {
  name?: string;
  products?: string[] | string;
  discountCode?: string;
  price?: number;
}

export interface BundleDeal {
  /** Wix CMS item id (may be undefined for items without an explicit id field) */
  id?: string;
  name: string;
  /** Raw SKUs as stored in CMS */
  skus: string[];
  discountCode: string;
  price: number;
  /** Catalog Product objects resolved by SKU; unknown SKUs are omitted */
  products: Product[];
}

export interface UseBundleDealsReturn {
  bundles: BundleDeal[];
  isLoading: boolean;
  error: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseSkus(raw: string[] | string | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  // Wix may serialise arrays as JSON strings
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function resolveProducts(skus: string[]): Product[] {
  return skus
    .map((sku) => PRODUCTS.find((p) => p.sku === sku))
    .filter((p): p is Product => p !== undefined);
}

function parseBundle(raw: RawBundleDeal): BundleDeal | null {
  if (!raw.name || !raw.discountCode || raw.price === undefined) return null;
  const skus = parseSkus(raw.products);
  return {
    name: raw.name,
    skus,
    discountCode: raw.discountCode,
    price: raw.price,
    products: resolveProducts(skus),
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBundleDeals(sku?: string): UseBundleDealsReturn {
  const wixClient = useOptionalWixClient();

  const [bundles, setBundles] = useState<BundleDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!wixClient) {
      setBundles([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const queryOptions: Parameters<typeof wixClient.queryData>[1] = {};
    if (sku) {
      queryOptions.filter = { products: { $hasSome: [sku] } };
    }

    wixClient
      .queryData<RawBundleDeal>(COLLECTION_ID, queryOptions)
      .then(({ items }) => {
        if (cancelled) return;
        const parsed = items.map(parseBundle).filter((b): b is BundleDeal => b !== null);
        setBundles(parsed);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setBundles([]);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [wixClient, sku]);

  return { bundles, isLoading, error };
}
