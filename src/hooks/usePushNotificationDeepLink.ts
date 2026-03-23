/**
 * @module usePushNotificationDeepLink
 *
 * Routes gamification push notification taps (streak_milestone,
 * quest_complete, spin_reminder) to the correct Loyalty screen tab.
 *
 * Handles both app states:
 *   Cold-start  — reads getLastNotificationResponseAsync() on mount
 *   Foreground  — addNotificationResponseReceivedListener while running
 *
 * Non-gamification notification types are ignored so this hook can
 * coexist with usePushDeepLink without double-routing.
 *
 * Malformed payloads (null data, no type) call nav.goBack() as a
 * safe fallback, matching the existing usePushDeepLink behaviour.
 *
 * Bead: cm-cf-m1c
 */
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { isGamificationType, resolveGamificationRoute } from '@/navigation/deepLinkHandlers';
import { captureException } from '@/services/crashReporting';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/AppNavigator';

export interface UsePushNotificationDeepLinkOptions {
  navigationRef: Pick<
    NavigationContainerRefWithCurrent<RootStackParamList>,
    'isReady' | 'navigate' | 'goBack'
  >;
}

/**
 * Resolve a notification response to a navigation call.
 * Returns without acting when:
 *   - navigation is not yet ready
 *   - actionIdentifier is not the default tap
 *   - type is not a gamification type (caller should handle it instead)
 */
function handleResponse(
  response: Notifications.NotificationResponse,
  nav: UsePushNotificationDeepLinkOptions['navigationRef'],
): void {
  if (!nav.isReady()) return;
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

  const data = response.notification.request.content.data as
    | Record<string, string>
    | null
    | undefined;

  if (!data) {
    nav.goBack();
    return;
  }

  const type = data.type;

  if (!type) {
    nav.goBack();
    return;
  }

  // Non-gamification types are handled by usePushDeepLink — ignore here.
  if (!isGamificationType(type)) return;

  const route = resolveGamificationRoute(type);
  nav.navigate(route.screen as any, route.params as any);
}

export function usePushNotificationDeepLink({
  navigationRef,
}: UsePushNotificationDeepLinkOptions): void {
  // Cold-start: check if the app was launched by tapping a gamification notification
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

  // Foreground / background: listen for notification taps while running
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
