/**
 * @module useCartCrossSell
 *
 * Cart cross-sell recommendation hook — cfutons_mobile-pwk.
 *
 * Derives "Customers also bought" suggestions from the current cart contents.
 * Cross-sell logic: futons → covers + mattresses; mattresses → covers + futons;
 * covers → futons + mattresses; fallback to same-category products not in cart.
 *
 * Queries Wix catalog when available; falls back to static PRODUCTS catalog.
 * Results are cached in memory for 5 minutes per cart key.
 */
import { useState, useEffect, useRef } from 'react';
import { PRODUCTS, type Product, type ProductCategory } from '@/data/products';
import { modelIdToProductId } from '@/data/productId';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import type { CartItem } from '@/hooks/useCart';

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_RESULTS = 8;

/** Cross-sell category map: given a cart category, which categories to surface. */
const CROSS_SELL_MAP: Partial<Record<ProductCategory, ProductCategory[]>> = {
  futons: ['covers', 'mattresses'],
  mattresses: ['covers', 'futons'],
  covers: ['futons', 'mattresses'],
  frames: ['futons', 'mattresses'],
  'murphy-beds': ['mattresses', 'covers'],
  pillows: ['futons', 'covers'],
  accessories: ['futons', 'covers'],
};

interface CacheEntry {
  data: Product[];
  expiresAt: number;
}

const crossSellCache = new Map<string, CacheEntry>();

export function clearCartCrossSellCache(): void {
  crossSellCache.clear();
}

export interface CartCrossSellResult {
  recommendations: Product[];
  isLoading: boolean;
  error: string | null;
}

/** Derive a stable cache key from cart item IDs. */
function cartCacheKey(items: CartItem[]): string {
  return items
    .map((i) => i.id)
    .sort()
    .join(',');
}

/**
 * Resolve which Product corresponds to a CartItem, if any.
 * Uses modelIdToProductId to bridge FutonModelId → ProductId.
 */
function cartItemToProduct(item: CartItem): Product | undefined {
  try {
    const pid = modelIdToProductId(item.model.id);
    return PRODUCTS.find((p) => p.id === pid);
  } catch {
    return undefined;
  }
}

/**
 * Compute cross-sell recommendations from static PRODUCTS for the given cart.
 * Excludes products already in the cart. Deduplicates. Limits to MAX_RESULTS.
 */
function getStaticCrossSell(cartProducts: Product[], cartProductIds: Set<string>): Product[] {
  const targetCategories = new Set<ProductCategory>();
  for (const p of cartProducts) {
    const targets = CROSS_SELL_MAP[p.category];
    if (targets) {
      for (const cat of targets) targetCategories.add(cat);
    }
  }

  const seen = new Set<string>();
  const results: Product[] = [];

  for (const product of PRODUCTS) {
    if (seen.has(product.id) || cartProductIds.has(product.id)) continue;
    if (targetCategories.has(product.category)) {
      seen.add(product.id);
      results.push(product);
      if (results.length >= MAX_RESULTS) break;
    }
  }

  return results;
}

/**
 * Returns cross-sell product recommendations for the items currently in the cart.
 *
 * @param cartItems - Items currently in the shopping cart.
 * @returns { recommendations, isLoading, error }
 */
export function useCartCrossSell(cartItems: CartItem[]): CartCrossSellResult {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(cartItems.length > 0);
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

  // Stable serialization of cart item IDs for effect deps
  const cartKey = cartCacheKey(cartItems);

  useEffect(() => {
    if (cartItems.length === 0) {
      setRecommendations([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const cached = crossSellCache.get(cartKey);
    if (cached && Date.now() < cached.expiresAt) {
      setRecommendations(cached.data);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const cartProducts = cartItems.map(cartItemToProduct).filter(Boolean) as Product[];
    const cartProductIds = new Set(cartProducts.map((p) => p.id));

    (async () => {
      const client = wixClientRef.current;
      try {
        let recs: Product[];
        if (client) {
          const { products: wixProducts } = await client.queryProducts({ limit: 100 });
          const targetCategories = new Set<ProductCategory>();
          for (const p of cartProducts) {
            const targets = CROSS_SELL_MAP[p.category];
            if (targets) {
              for (const cat of targets) targetCategories.add(cat);
            }
          }
          const seen = new Set<string>();
          recs = [];
          for (const p of wixProducts) {
            if (seen.has(p.id) || cartProductIds.has(p.id)) continue;
            if (targetCategories.has(p.category)) {
              seen.add(p.id);
              recs.push(p);
              if (recs.length >= MAX_RESULTS) break;
            }
          }
        } else {
          recs = getStaticCrossSell(cartProducts, cartProductIds);
        }

        crossSellCache.set(cartKey, { data: recs, expiresAt: Date.now() + CACHE_TTL_MS });
        if (mountedRef.current) {
          setRecommendations(recs);
          setIsLoading(false);
          setError(null);
        }
      } catch {
        const recs = getStaticCrossSell(cartProducts, cartProductIds);
        crossSellCache.set(cartKey, { data: recs, expiresAt: Date.now() + CACHE_TTL_MS });
        if (mountedRef.current) {
          setRecommendations(recs);
          setIsLoading(false);
          setError('[useCartCrossSell] Wix fetch failed — showing local cross-sell');
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey]);

  return { recommendations, isLoading, error };
}
