/**
 * Automatic screen tracking via React Navigation state changes.
 *
 * Usage in App.tsx:
 *   const navigationRef = useNavigationContainerRef();
 *   useScreenTracking(navigationRef);
 *
 * Tracks screen_view events with the current route name whenever
 * navigation state changes. Skips duplicate consecutive views.
 */

import { useCallback, useRef } from 'react';
import type { NavigationContainerRef } from '@react-navigation/native';
import { trackScreenView } from '@/services/analytics';
import { addBreadcrumb } from '@/services/crashReporting';

/**
 * Returns an onStateChange callback to pass to NavigationContainer.
 * Tracks screen views automatically on navigation changes.
 */
export function useScreenTracking(
  navigationRef: React.RefObject<NavigationContainerRef<Record<string, unknown>> | null>,
) {
  const previousRouteNameRef = useRef<string | undefined>();

  const onStateChange = useCallback(() => {
    const currentRoute = navigationRef.current?.getCurrentRoute();
    const currentRouteName = currentRoute?.name;

    if (currentRouteName && currentRouteName !== previousRouteNameRef.current) {
      // Track screen view
      const params = currentRoute?.params as Record<string, string | number | boolean> | undefined;
      trackScreenView(currentRouteName, params);

      // Add breadcrumb for crash reporting context
      addBreadcrumb(`Navigate to ${currentRouteName}`, 'navigation');

      previousRouteNameRef.current = currentRouteName;
    }
  }, [navigationRef]);

  const onReady = useCallback(() => {
    const currentRoute = navigationRef.current?.getCurrentRoute();
    if (currentRoute?.name) {
      previousRouteNameRef.current = currentRoute.name;
      trackScreenView(currentRoute.name);
      addBreadcrumb(`Initial screen: ${currentRoute.name}`, 'navigation');
    }
  }, [navigationRef]);

  return { onStateChange, onReady };
}
