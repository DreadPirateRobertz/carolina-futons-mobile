/**
 * @module useProductShippingEstimate
 *
 * Provides a zip-code-driven shipping estimate for a single product on the PDP.
 * User enters their zip; it's persisted to AsyncStorage and used to call the
 * /_functions/getShippingEstimate backend webmethod.
 *
 * cm-9yn
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOptionalWixClient } from '@/services/wix/wixProvider';

const STORAGE_KEY = 'shipping_zip';
const ZIP_RE = /^\d{5}(-\d{4})?$/;

export interface ProductDimensions {
  width: number;
  depth: number;
  height: number;
}

export interface ShippingRate {
  amount: string;
  carrier: string;
  serviceLevel: string;
  isEstimate: boolean;
  isFreight: boolean;
}

export interface UseProductShippingEstimateResult {
  zip: string;
  setZip: (zip: string) => void;
  rate: ShippingRate | null;
  isLoading: boolean;
  error: Error | null;
}

interface Props {
  productId: string;
  dimensions: ProductDimensions;
}

export function useProductShippingEstimate({
  productId,
  dimensions,
}: Props): UseProductShippingEstimateResult {
  const wixClient = useOptionalWixClient();

  const [zip, setZipState] = useState('');
  const [rate, setRate] = useState<ShippingRate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track active fetch so stale responses are discarded
  const fetchIdRef = useRef(0);
  // Stable ref to avoid wixClient object identity triggering re-runs
  const wixClientRef = useRef(wixClient);
  wixClientRef.current = wixClient;

  // Load persisted zip on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setZipState(stored);
      })
      .catch(() => {
        // Ignore storage errors — zip stays empty
      });
  }, []);

  const setZip = useCallback((newZip: string) => {
    setZipState(newZip);
    AsyncStorage.setItem(STORAGE_KEY, newZip).catch(() => {});
  }, []);

  // Stabilize dimensions — only re-run when values actually change
  const dimW = dimensions.width;
  const dimD = dimensions.depth;
  const dimH = dimensions.height;

  // Fetch estimate whenever zip, productId, or dimensions values change
  useEffect(() => {
    if (!ZIP_RE.test(zip)) {
      // Not a valid zip yet — clear results without error
      setRate(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const client = wixClientRef.current;
    if (!client) {
      // No client available — silent, no rate
      setRate(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const fetchId = ++fetchIdRef.current;
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    setRate(null);

    let promise: Promise<unknown>;
    try {
      promise = client.getShippingEstimate({
        zip,
        productId,
        dimensions: { width: dimW, depth: dimD, height: dimH },
      });
    } catch (syncErr) {
      if (!cancelled && fetchIdRef.current === fetchId) {
        setError(syncErr instanceof Error ? syncErr : new Error('Shipping estimate failed'));
        setRate(null);
        setIsLoading(false);
      }
      return;
    }

    promise
      .then((res: unknown) => {
        if (cancelled || fetchIdRef.current !== fetchId) return;
        const r = res as { success: boolean; rate?: string; carrier?: string; serviceLevel?: string; isEstimate?: boolean; isFreight?: boolean; error?: string };
        if (!r.success) {
          setError(new Error(r.error ?? 'Shipping estimate unavailable'));
          setRate(null);
        } else {
          setRate({
            amount: r.rate ?? '0',
            carrier: r.carrier ?? '',
            serviceLevel: r.serviceLevel ?? 'parcel',
            isEstimate: r.isEstimate ?? false,
            isFreight: r.isFreight ?? false,
          });
          setError(null);
        }
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled || fetchIdRef.current !== fetchId) return;
        setError(err instanceof Error ? err : new Error('Shipping estimate failed'));
        setRate(null);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  // wixClient intentionally omitted — accessed via wixClientRef to avoid
  // new object identity on every render causing infinite effect re-runs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zip, productId, dimW, dimD, dimH]);

  return { zip, setZip, rate, isLoading, error };
}
