/**
 * @module useSearchSuggestions
 *
 * Returns autocomplete suggestions for a search query.
 *
 * When Wix is configured, suggestions are fetched from the Wix Stores API
 * (queryProducts with limit:5) so they reflect the live catalog. When Wix
 * is unavailable, the provided fallback suggestions (local fuzzy results)
 * are returned immediately with no network call.
 *
 * Cancels in-flight requests when the query changes to prevent stale results.
 *
 * Bead: cfutons_mobile-57u
 */

import { useState, useEffect, useRef } from 'react';
import { useOptionalWixClient } from '@/services/wix';
import { isWixConfigured } from '@/services/wix/config';
import { captureException } from '@/services/crashReporting';

const MIN_QUERY_LENGTH = 2;
const SUGGESTION_LIMIT = 6;

export interface SearchSuggestionsResult {
  suggestions: string[];
  isLoading: boolean;
}

/**
 * Autocomplete suggestions hook.
 *
 * @param query - Debounced search query (caller is responsible for debouncing).
 * @param fallbackSuggestions - Local fuzzy suggestions used when Wix is unavailable.
 * @returns suggestions and loading state.
 */
export function useSearchSuggestions(
  query: string,
  fallbackSuggestions: string[],
): SearchSuggestionsResult {
  const wixClient = useOptionalWixClient();
  const useWix = isWixConfigured() && wixClient !== null;

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Keep refs so the effect reads current values without re-running on identity changes
  const fallbackRef = useRef(fallbackSuggestions);
  fallbackRef.current = fallbackSuggestions;
  const wixClientRef = useRef(wixClient);
  wixClientRef.current = wixClient;

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    if (!useWix || !wixClientRef.current) {
      // Local fallback — synchronous, no loading state
      setSuggestions(fallbackRef.current);
      setIsLoading(false);
      return;
    }

    // Wix API path — cancel any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);

    wixClientRef.current
      .queryProducts({ search: trimmed, limit: SUGGESTION_LIMIT })
      .then((result) => {
        if (controller.signal.aborted) return;

        const names = (result.products ?? []).map((p: { name: string }) => p.name);

        // Deduplicate case-insensitively, preserving first occurrence
        const seen = new Set<string>();
        const unique = names.filter((name) => {
          const key = name.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setSuggestions(unique);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        captureException(err instanceof Error ? err : new Error(String(err)));
        // Network/API error — fall back to local suggestions
        setSuggestions(fallbackRef.current);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [query, useWix]);

  return { suggestions, isLoading };
}
