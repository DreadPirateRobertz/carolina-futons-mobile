/**
 * @module useDeliveryEstimate
 *
 * Fetches a delivery estimate from godfrey's getDeliveryEstimate Wix webMethod.
 * (cm-uyd: Delivery Estimator mobile UI)
 *
 * When Wix client unavailable, returns a static fallback estimate.
 * Never blocks the UI — loading state is synchronous-fast in the fallback path.
 */

import { useState, useEffect } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';

const FALLBACK_TEXT = '2-5 business days';

export interface DeliveryEstimateResult {
  /** Human-readable delivery window, e.g. "Arrives Mar 27 – Mar 31" or "2-5 business days" */
  displayText: string;
  /** True when using the fallback estimate (no UPS rates or no Wix client) */
  isFallback: boolean;
  /** UPS service name, e.g. "UPS Ground", or null */
  service: string | null;
}

export interface UseDeliveryEstimateReturn {
  estimate: DeliveryEstimateResult | null;
  isLoading: boolean;
  /** Error message string from the API, or a generic network error message */
  error: string | null;
  /** Re-fetch the estimate (e.g. after error or zip change) */
  refresh: () => void;
}

/** Format an ISO date string to "Mon D" e.g. "Mar 27" */
function formatShortDate(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00Z'); // noon UTC avoids timezone flips
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function buildDisplayText(
  estimate: string | null,
  minDate: string | null,
  maxDate: string | null,
  source: string | null,
): string {
  if (source !== 'fallback' && minDate && maxDate) {
    const min = formatShortDate(minDate);
    const max = formatShortDate(maxDate);
    return min === max ? `Arrives ${min}` : `Arrives ${min} – ${max}`;
  }
  return estimate ?? FALLBACK_TEXT;
}

export function useDeliveryEstimate(zip: string, productIds: string[]): UseDeliveryEstimateReturn {
  const wixClient = useOptionalWixClient();
  const [estimate, setEstimate] = useState<DeliveryEstimateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const trimmedZip = zip.trim();

    if (!trimmedZip || productIds.length === 0) {
      setEstimate(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Static fallback when no Wix client
    if (!wixClient) {
      setEstimate({ displayText: FALLBACK_TEXT, isFallback: true, service: null });
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    wixClient
      .fetchDeliveryEstimate(trimmedZip, productIds)
      .then(
        (res: {
          success: boolean;
          estimate?: string | null;
          minDate?: string | null;
          maxDate?: string | null;
          source?: string | null;
          service?: string | null;
          error?: string;
        }) => {
          if (cancelled) return;
          if (!res.success) {
            setError(res.error ?? 'Could not estimate delivery for this zip code.');
            setEstimate(null);
          } else {
            const displayText = buildDisplayText(
              res.estimate ?? null,
              res.minDate ?? null,
              res.maxDate ?? null,
              res.source ?? null,
            );
            setEstimate({
              displayText,
              isFallback: res.source === 'fallback',
              service: res.service ?? null,
            });
            setError(null);
          }
        },
      )
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Network error. Please try again.';
        setError(msg);
        setEstimate(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [zip, JSON.stringify(productIds), wixClient, refreshToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => setRefreshToken((t) => t + 1);

  return { estimate, isLoading, error, refresh };
}
