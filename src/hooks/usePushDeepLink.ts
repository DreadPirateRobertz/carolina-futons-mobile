/**
 * @module usePushDeepLink
 *
 * Handles push notification tap → React Navigation routing for all app states:
 *  - Cold-start: reads getLastNotificationResponseAsync() on mount
 *  - Background / foreground: addNotificationResponseReceivedListener
 *
 * For malformed payloads (no recognized screen), calls navigationRef.goBack()
 * as a safe fallback so the user isn't left on a broken screen.
 *
 * Bead: cm-e2z
 */
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import {
  type NotificationType,
  getDeepLinkForNotification,
  getDeepLinkFromPayload,
} from '@/services/notifications';
import { parseDeepLink, resolveRoute } from '@/services/deepLink';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { captureException } from '@/services/crashReporting';

export interface UsePushDeepLinkOptions {
  navigationRef: Pick<
    NavigationContainerRefWithCurrent<RootStackParamList>,
    'isReady' | 'navigate' | 'goBack'
  >;
}

/** Map a resolved DeepLinkRoute to a navigate() call or goBack() fallback. */
function routeAndNavigate(
  route: ReturnType<typeof resolveRoute>,
  nav: UsePushDeepLinkOptions['navigationRef'],
): void {
  if (!nav.isReady()) return;

  if (route.screen === 'NotFound') {
    nav.goBack();
    return;
  }

  const params = 'params' in route ? route.params : undefined;
  nav.navigate(route.screen as any, params as any);
}

/**
 * Resolve a notification response (tap event) to a React Navigation call.
 * Returns false if the payload was unroutable (caller may goBack()).
 */
function handleResponse(
  response: Notifications.NotificationResponse,
  nav: UsePushDeepLinkOptions['navigationRef'],
): void {
  if (!nav.isReady()) return;
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

  const data = response.notification.request.content.data as
    | Record<string, string>
    | null
    | undefined;

  // Null / undefined data → malformed, goBack
  if (!data) {
    nav.goBack();
    return;
  }

  // Resolve URL from type-based or payload-based routing
  const deepLink = data.type
    ? getDeepLinkForNotification(data.type as NotificationType, data)
    : getDeepLinkFromPayload(data);

  // No recognized deep link → malformed payload, goBack
  if (!deepLink) {
    nav.goBack();
    return;
  }

  const parsed = parseDeepLink(deepLink);
  const route = resolveRoute(parsed);
  routeAndNavigate(route, nav);
}

export function usePushDeepLink({ navigationRef }: UsePushDeepLinkOptions): void {
  // Cold-start: check if the app was launched by tapping a notification
  useEffect(() => {
    let cancelled = false;

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (cancelled || !response) return;
        handleResponse(response, navigationRef);
      })
      .catch((err) => {
        captureException(err instanceof Error ? err : new Error(String(err)));
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background / foreground: listen for notification taps while running
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        handleResponse(response, navigationRef);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)));
      }
    });

    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
