/**
 * @module useNetworkErrorRecovery
 *
 * Hook that wraps async data fetchers with error state management and retry
 * logic. Tracks whether data is stale (device offline) and provides a retry
 * function that re-invokes the fetcher. Pairs with NetworkErrorState and
 * StaleDataBadge components for UI rendering.
 */

import { useState, useCallback, useRef } from 'react';
import { useConnectivity } from './useConnectivity';

interface UseNetworkErrorRecoveryResult<T> {
  error: string | null;
  isRetrying: boolean;
  isStale: boolean;
  execute: (...args: unknown[]) => Promise<T>;
  retry: () => Promise<T | void>;
  clearError: () => void;
}

export function useNetworkErrorRecovery<T = unknown>(
  fetcher: (...args: unknown[]) => Promise<T>,
): UseNetworkErrorRecoveryResult<T> {
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [fetchedStale, setFetchedStale] = useState(false);
  const { isOnline } = useConnectivity();
  const lastArgsRef = useRef<unknown[]>([]);
  const isRetryingRef = useRef(false);

  const execute = useCallback(
    async (...args: unknown[]): Promise<T> => {
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
        .catch(() => undefined)
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
