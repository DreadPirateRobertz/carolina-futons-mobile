/**
 * @module useSommelierResults
 *
 * Fetches SommelierResults (style quiz) data for the authenticated user.
 * Used by HomeScreen to show personalized category grid.
 * Returns null for unauthenticated users or when no quiz results exist.
 *
 * hq-5hnml
 */

import { useState, useEffect, useRef } from 'react';
import { getSommelierResults, type SommelierResultsData } from '@/services/sommelierResults';
import { useAuth } from '@/hooks/useAuth';

export interface UseSommelierResultsReturn {
  results: SommelierResultsData | null;
  isLoading: boolean;
  error: string | null;
  hasResults: boolean;
}

export function useSommelierResults(): UseSommelierResultsReturn {
  const { user, isAuthenticated } = useAuth();
  const [results, setResults] = useState<SommelierResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    if (!isAuthenticated || !user?.id) {
      setResults(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);

    getSommelierResults(user.id)
      .then((data) => {
        if (cancelledRef.current) return;
        setResults(data);
        setIsLoading(false);
        setError(null);
      })
      .catch(() => {
        if (cancelledRef.current) return;
        setIsLoading(false);
      });

    return () => {
      cancelledRef.current = true;
    };
  }, [isAuthenticated, user?.id]);

  return {
    results,
    isLoading,
    error,
    hasResults: results !== null,
  };
}
