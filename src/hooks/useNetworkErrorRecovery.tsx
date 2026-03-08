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
  const { isOnline } = useConnectivity();
  const lastArgsRef = useRef<unknown[]>([]);

  const execute = useCallback(
    async (...args: unknown[]): Promise<T> => {
      lastArgsRef.current = args;
      try {
        const result = await fetcher(...args);
        setError(null);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        setError(message);
        throw err;
      }
    },
    [fetcher],
  );

  const retry = useCallback(async (): Promise<T | void> => {
    setIsRetrying(true);
    try {
      const result = await execute(...lastArgsRef.current);
      return result;
    } catch {
      // error is already set by execute
    } finally {
      setIsRetrying(false);
    }
  }, [execute]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isRetrying,
    isStale: !isOnline,
    execute,
    retry,
    clearError,
  };
}
