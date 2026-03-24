/**
 * @module usePushNotificationDeepLink
 *
 * Handles gamification push notification tap → React Navigation routing.
 *
 * Gamification notifications carry a `gamification_type` field in their data
 * payload (e.g. streak_milestone, tier_upgrade, new_mover_welcome). This hook
 * is the companion to usePushDeepLink — usePushDeepLink handles commerce
 * notification types (order_update, promotion, etc.), this hook handles
 * gamification notification types.
 *
 * Both hooks subscribe to expo-notifications and should be used together in
 * AppNavigator so all notification tap paths are covered.
 *
 * Bead: hq-wjwhm
 */
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import {
  type GamificationNotificationType,
  getDeepLinkForGamificationNotification,
} from '@/services/notifications';
import { parseDeepLink, resolveRoute } from '@/services/deepLink';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { captureException } from '@/services/crashReporting';

export interface UsePushNotificationDeepLinkOptions {
  navigationRef: Pick<
    NavigationContainerRefWithCurrent<RootStackParamList>,
    'isReady' | 'navigate' | 'goBack'
  >;
}

/** Returns true if the data payload contains a recognized gamification_type field. */
export function isGamificationNotification(
  data: Record<string, string> | null | undefined,
): data is Record<string, string> & { gamification_type: GamificationNotificationType } {
  if (!data?.gamification_type) return false;
  const validTypes: GamificationNotificationType[] = [
    'streak_milestone',
    'points_milestone',
    'tier_upgrade',
    'challenge_complete',
    'badge_earned',
    'new_mover_welcome',
  ];
  return validTypes.includes(data.gamification_type as GamificationNotificationType);
}

/** Resolve a gamification notification response to a navigate() call. */
function handleGamificationResponse(
  response: Notifications.NotificationResponse,
  nav: UsePushNotificationDeepLinkOptions['navigationRef'],
): boolean {
  if (!nav.isReady()) return false;
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return false;

  const data = response.notification.request.content.data as
    | Record<string, string>
    | null
    | undefined;

  if (!isGamificationNotification(data)) return false;

  const deepLink = getDeepLinkForGamificationNotification(data.gamification_type);
  const parsed = parseDeepLink(deepLink);
  const route = resolveRoute(parsed);

  if (route.screen === 'NotFound') {
    nav.goBack();
    return true;
  }

  const params = 'params' in route ? route.params : undefined;
  nav.navigate(route.screen as any, params as any);
  return true;
}

/**
 * Subscribe to expo-notifications for gamification push notification taps.
 * Handles cold-start and foreground/background tap paths.
 * Returns false from handleGamificationResponse when payload is not gamification
 * (allowing usePushDeepLink to handle the same event via its own listener).
 */
export function usePushNotificationDeepLink({
  navigationRef,
}: UsePushNotificationDeepLinkOptions): void {
  // Cold-start: check if app was launched by tapping a gamification notification
  useEffect(() => {
    let cancelled = false;

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (cancelled || !response) return;
        handleGamificationResponse(response, navigationRef);
      })
      .catch((err) => {
        captureException(err instanceof Error ? err : new Error(String(err)));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background / foreground: listen for gamification notification taps while running
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        handleGamificationResponse(response, navigationRef);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)));
      }
    });

    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
