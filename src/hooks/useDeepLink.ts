/**
 * @module useDeepLink
 *
 * Manages the full deep link lifecycle: cold-start URLs, foreground link events,
 * and deferred deep links (stored when the app wasn't running). Extracts UTM
 * (Urchin Tracking Module) params for attribution analytics.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import {
  parseDeepLink,
  resolveRoute,
  consumePendingDeepLink,
  type ParsedDeepLink,
  type DeepLinkRoute,
  type UTMParams,
} from '@/services/deepLink';

export interface UseDeepLinkOptions {
  /** Called whenever a deep link is processed (initial, foreground, or deferred) */
  onDeepLink?: (parsed: ParsedDeepLink, route: DeepLinkRoute) => void;
}

export interface UseDeepLinkResult {
  /** The last processed deep link URL */
  lastUrl: string | null;
  /** The resolved route for the last deep link */
  lastRoute: DeepLinkRoute | null;
  /** UTM params from the last deep link */
  lastUtm: UTMParams | null;
}

/**
 * Hook for handling deep link lifecycle:
 * - Checks initial URL when app opens from a link
 * - Listens for foreground link events
 * - Processes deferred deep links from pending storage
 */
export function useDeepLink(options?: UseDeepLinkOptions): UseDeepLinkResult {
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [lastRoute, setLastRoute] = useState<DeepLinkRoute | null>(null);
  const [lastUtm, setLastUtm] = useState<UTMParams | null>(null);
  const onDeepLinkRef = useRef(options?.onDeepLink);
  onDeepLinkRef.current = options?.onDeepLink;

  const processUrl = useCallback((url: string) => {
    if (!url) return;

    const parsed = parseDeepLink(url);
    const route = resolveRoute(parsed);

    setLastUrl(url);
    setLastRoute(route);
    setLastUtm(parsed.utm);

    onDeepLinkRef.current?.(parsed, route);
  }, []);

  useEffect(() => {
    // Check initial URL (app opened from deep link)
    async function checkInitialUrl() {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          processUrl(initialUrl);
          return;
        }
      } catch {
        // Native module may not be available — continue silently
      }

      // Fall back to deferred deep link if no initial URL
      const pending = consumePendingDeepLink();
      if (pending) {
        processUrl(pending);
      }
    }

    checkInitialUrl();

    // Listen for foreground deep link events
    const subscription = Linking.addEventListener('url', (event) => {
      processUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [processUrl]);

  return { lastUrl, lastRoute, lastUtm };
}
