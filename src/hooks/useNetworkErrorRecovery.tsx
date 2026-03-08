/**
 * @module useNetworkErrorRecovery
 *
 * Hook that wraps async data fetchers with error state management and retry
 * logic. Tracks whether data is stale (device offline or last fetch failed)
 * and provides a retry function that re-invokes the fetcher. Pairs with
 * NetworkErrorState and StaleDataBadge components for UI rendering.
 *
 * `execute` sets error state on failure AND re-throws — callers must handle
 * the rejection. `retry` is fire-and-forget: it swallows errors (already
 * surfaced via the `error` state) and is safe to pass directly to UI callbacks.
 */

import { useState, useCallback, useRef } from 'react';
import { useConnectivity } from './useConnectivity';
import { captureException } from '@/services/crashReporting';

interface UseNetworkErrorRecoveryResult<TArgs extends unknown[], T> {
  error: string | null;
  isRetrying: boolean;
  isStale: boolean;
  execute: (...args: TArgs) => Promise<T>;
  retry: () => Promise<T | void>;
  clearError: () => void;
}

export function useNetworkErrorRecovery<TArgs extends unknown[] = unknown[], T = unknown>(
  fetcher: (...args: TArgs) => Promise<T>,
): UseNetworkErrorRecoveryResult<TArgs, T> {
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [fetchedStale, setFetchedStale] = useState(false);
  const { isOnline } = useConnectivity();
  const lastArgsRef = useRef<TArgs>([] as unknown as TArgs);
  const isRetryingRef = useRef(false);

  const execute = useCallback(
    async (...args: TArgs): Promise<T> => {
      lastArgsRef.current = args;
      try {
        const result = await fetcher(...args);
        setError(null);
        setFetchedStale(false);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        setError(message);
        setFetchedStale(true);
        throw err;
      }
    },
    [fetcher],
  );

  const retry = useCallback(
    (): Promise<T | void> => {
      if (isRetryingRef.current) return Promise.resolve();
      isRetryingRef.current = true;
      setIsRetrying(true);
      return execute(...lastArgsRef.current)
        .catch((err) => {
          if (err instanceof Error) {
            captureException(err, 'warning', { action: 'network_error_retry_failed' });
          }
        })
        .finally(() => {
          isRetryingRef.current = false;
          setIsRetrying(false);
        });
    },
    [execute],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isRetrying,
    isStale: !isOnline || fetchedStale,
    execute,
    retry,
    clearError,
  };
}
