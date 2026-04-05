/**
 * @module useBundleSuggestion
 *
 * Fetches a bundle suggestion for a given product from the Wix Data
 * `BundleDefinitions` collection. Returns the bundle definition, resolved
 * product catalog entries, calculated pricing (including coupon code), and
 * an add-to-cart action.
 *
 * Coupon codes follow the CF-BUNDLE-{8chars} format and are server-generated
 * by `calculateBundlePrice`.
 *
 * deacon-y8lf / cm-bun
 */

import { useState, useEffect, useCallback } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { PRODUCTS, type Product } from '@/data/products';

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
        const result = await wixClient.getCompatibleItems(productId);

        if (cancelled) return;

        if (!result) {
          setIsLoading(false);
          return;
        }

        setBundle(result);

        const resolvedProducts = result.productIds
          .map((id: string) => PRODUCTS.find((p) => p.id === id))
          .filter((p): p is Product => p !== undefined);
        setBundleProducts(resolvedProducts);

        const pricingResult = await wixClient.calculateBundlePrice(
          result.bundleId,
          result.productIds,
        );

        if (cancelled) return;

        setPricing(pricingResult);
        setIsLoading(false);
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
    if (!wixClient || !bundle || !pricing) return;

    setIsAddingToCart(true);
    try {
      await wixClient.addBundleToCart(bundle.bundleId, bundle.productIds, pricing.couponCode);
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
