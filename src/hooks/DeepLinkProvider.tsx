/**
 * @module DeepLinkProvider
 *
 * Wraps useDeepLink to track deep link opens via analytics and expose
 * last-link state to the component tree via context.
 */
import React, { createContext, useContext } from 'react';
import { useDeepLink, type UseDeepLinkResult } from './useDeepLink';
import { events } from '@/services/analytics';
import type { ParsedDeepLink, DeepLinkRoute } from '@/services/deepLink';

const DeepLinkContext = createContext<UseDeepLinkResult>({
  lastUrl: null,
  lastRoute: null,
  lastUtm: null,
});

export function useDeepLinkContext(): UseDeepLinkResult {
  return useContext(DeepLinkContext);
}

function handleDeepLink(parsed: ParsedDeepLink, route: DeepLinkRoute) {
  const screen = 'params' in route ? route.screen : route.screen;
  events.deepLinkOpened(parsed.raw, screen);
}

export function DeepLinkProvider({ children }: { children: React.ReactNode }) {
  const deepLink = useDeepLink({ onDeepLink: handleDeepLink });

  return (
    <DeepLinkContext.Provider value={deepLink}>
      {children}
    </DeepLinkContext.Provider>
  );
}
