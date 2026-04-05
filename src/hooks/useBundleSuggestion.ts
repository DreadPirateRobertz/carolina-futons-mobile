/**
 * @module useBundleSuggestion
 *
 * Fetches a bundle suggestion for a given product from the Wix Data
 * `BundleDefinitions` collection. Returns the bundle definition, resolved
 * product catalog entries, client-calculated pricing, and an add-to-cart action.
 *
 * Coupon codes follow the CF-BUNDLE-{8chars} format, generated client-side
 * from the bundleId.
 *
 * deacon-y8lf / cm-bun
 */

import { useState, useEffect, useCallback } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { PRODUCTS, type Product } from '@/data/products';

const COLLECTION_ID = 'BundleDefinitions';

interface RawBundleRecord {
  bundleId?: string;
  name?: string;
  productIds?: string[];
  discountPercent?: number;
}

export interface BundleDefinition {
  bundleId: string;
  name: string;
  productIds: string[];
  discountPercent: number;
}

export interface BundlePricing {
  originalTotal: number;
  bundlePrice: number;
  savings: number;
  savingsPercent: number;
  couponCode: string;
}

export interface UseBundleSuggestionReturn {
  bundle: BundleDefinition | null;
  bundleProducts: Product[];
  pricing: BundlePricing | null;
  isLoading: boolean;
  error: string | null;
  addBundleToCart: () => Promise<void>;
  isAddingToCart: boolean;
  addSuccess: boolean;
}

function generateCouponCode(bundleId: string): string {
  // Deterministic 8-char suffix from bundleId
  let hash = 0;
  for (let i = 0; i < bundleId.length; i++) {
    hash = ((hash << 5) - hash + bundleId.charCodeAt(i)) | 0;
  }
  const suffix = Math.abs(hash).toString(36).toUpperCase().padStart(8, '0').slice(0, 8);
  return `CF-BUNDLE-${suffix}`;
}

function calculatePricing(bundle: BundleDefinition, products: Product[]): BundlePricing {
  const originalTotal = products.reduce((sum, p) => sum + (p.price ?? 0), 0);
  const savings = originalTotal * (bundle.discountPercent / 100);
  const bundlePrice = originalTotal - savings;
  return {
    originalTotal,
    bundlePrice,
    savings,
    savingsPercent: bundle.discountPercent,
    couponCode: generateCouponCode(bundle.bundleId),
  };
}

export function useBundleSuggestion(productId: string): UseBundleSuggestionReturn {
  const wixClient = useOptionalWixClient();

  const [bundle, setBundle] = useState<BundleDefinition | null>(null);
  const [bundleProducts, setBundleProducts] = useState<Product[]>([]);
  const [pricing, setPricing] = useState<BundlePricing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchBundle() {
      setIsLoading(true);
      setError(null);
      setBundle(null);
      setBundleProducts([]);
      setPricing(null);
      setAddSuccess(false);

      if (!wixClient || !productId) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const { items } = await wixClient.queryData<RawBundleRecord>(COLLECTION_ID, {
          filter: { productIds: { $hasSome: [productId] } },
          limit: 1,
        });

        if (cancelled) return;

        const raw = items[0];
        if (
          !raw?.bundleId ||
          !raw.name ||
          !Array.isArray(raw.productIds) ||
          raw.discountPercent === undefined
        ) {
          setIsLoading(false);
          return;
        }

        const def: BundleDefinition = {
          bundleId: raw.bundleId,
          name: raw.name,
          productIds: raw.productIds,
          discountPercent: raw.discountPercent,
        };

        const resolved = def.productIds
          .map((id) => PRODUCTS.find((p) => p.id === id))
          .filter((p): p is Product => p !== undefined);

        const pricingResult = calculatePricing(def, resolved);

        if (!cancelled) {
          setBundle(def);
          setBundleProducts(resolved);
          setPricing(pricingResult);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setBundle(null);
          setBundleProducts([]);
          setPricing(null);
          setIsLoading(false);
        }
      }
    }

    fetchBundle();

    return () => {
      cancelled = true;
    };
  }, [wixClient, productId]);

  const addBundleToCart = useCallback(async () => {
    if (!bundle || !pricing) return;

    setIsAddingToCart(true);
    try {
      // Record bundle intent in Wix for analytics/coupon tracking
      if (wixClient) {
        await wixClient.insertDataItem(COLLECTION_ID + 'Orders', {
          bundleId: bundle.bundleId,
          couponCode: pricing.couponCode,
          addedAt: new Date().toISOString(),
        });
      }
      setAddSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setAddSuccess(false);
    } finally {
      setIsAddingToCart(false);
    }
  }, [wixClient, bundle, pricing]);

  return {
    bundle,
    bundleProducts,
    pricing,
    isLoading,
    error,
    addBundleToCart,
    isAddingToCart,
    addSuccess,
  };
}
