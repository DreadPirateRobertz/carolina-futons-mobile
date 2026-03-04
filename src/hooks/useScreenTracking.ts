/**
 * Automatic screen tracking hook for React Navigation.
 *
 * Listens to navigation state changes and fires screen_view analytics events.
 * Attach the returned `onStateChange` and `ref` to your NavigationContainer.
 *
 * Usage:
 *   const { navigationRef, onStateChange, onReady } = useScreenTracking();
 *   <NavigationContainer ref={navigationRef} onStateChange={onStateChange} onReady={onReady}>
 */
import { useCallback, useRef } from 'react';
import { useNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { trackScreenView } from '@/services/analytics';
import { addBreadcrumb } from '@/services/crashReporting';

export function useScreenTracking() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const routeNameRef = useRef<string | undefined>();

  const onReady = useCallback(() => {
    const currentRoute = navigationRef.getCurrentRoute();
    routeNameRef.current = currentRoute?.name;
  }, [navigationRef]);

  const onStateChange = useCallback(() => {
    const currentRoute = navigationRef.getCurrentRoute();
    const currentRouteName = currentRoute?.name;
    const previousRouteName = routeNameRef.current;

    if (currentRouteName && currentRouteName !== previousRouteName) {
      trackScreenView(currentRouteName, currentRoute?.params as Record<string, string> | undefined);
      addBreadcrumb(`Navigate to ${currentRouteName}`, 'navigation', {
        from: previousRouteName ?? 'initial',
        to: currentRouteName,
      });
    }

    routeNameRef.current = currentRouteName;
  }, [navigationRef]);

  return { navigationRef, onStateChange, onReady };
}
