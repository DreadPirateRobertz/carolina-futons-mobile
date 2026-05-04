/**
 * @module GamificationPushBridge
 *
 * hq-1e63: Wire dispatchCrossRigPush + handleGamificationPushEvent to the
 * expo-notifications received listener. Must render inside BadgeToastProvider
 * and TriggerMomentsProvider.
 *
 * Handles gamification silent pushes from the CFW cross-rig pipeline:
 *   - dispatchCrossRigPush        → schedules the local device notification
 *   - handleGamificationPushEvent → routes to in-app UI callbacks:
 *       badge_earned       → showBadgeToast (BadgeToastContext)
 *       tier_changed       → reportTierChanged (TriggerMomentsContext)
 *       challenge_complete → reportChallengesCompleted (TriggerMomentsContext)
 *       streak_milestone   → reportTriggers({ milestoneUnlocked: true })
 */
import { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';
import * as Notifications from 'expo-notifications';
import { dispatchCrossRigPush } from '@/services/crossRigPushDispatch';
import {
  handleGamificationPushEvent,
  type GamificationPushPayload,
} from '@/services/gamificationPushHandler';
import { emitBadgeEarned } from '@/services/crossRigEventBus';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';
import { useBadgeToastContext } from '@/contexts/BadgeToastContext';
import { useTriggerMomentsContext } from '@/contexts/TriggerMomentsContext';
import type { ServerTriggers, ChallengeCompletedItem } from '@/hooks/useTriggerMoments';

type Callbacks = {
  showBadgeToast: (name: string) => void;
  reportTierChanged: (tier: string) => void;
  reportChallengesCompleted: (items: ChallengeCompletedItem[]) => void;
  reportTriggers: (triggers: ServerTriggers) => void;
};

export function GamificationPushBridge() {
  const { showBadgeToast } = useBadgeToastContext();
  const { reportTierChanged, reportChallengesCompleted, reportTriggers } =
    useTriggerMomentsContext();

  // Latest-ref pattern: keep callbacks current without re-registering the listener
  const cbRef = useRef<Callbacks>({ showBadgeToast, reportTierChanged, reportChallengesCompleted, reportTriggers });
  cbRef.current = { showBadgeToast, reportTierChanged, reportChallengesCompleted, reportTriggers };

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
      const event = typeof data.event === 'string' ? data.event : undefined;
      if (!event) return;

      const memberId = typeof data.memberId === 'string' ? data.memberId : '';
      const cb = cbRef.current;

      dispatchCrossRigPush(memberId, event, data);

      if (event === 'badge_earned') {
        const badgeName = typeof data.badgeName === 'string' ? data.badgeName : 'a badge';
        const badgeId = typeof data.badgeId === 'string' ? data.badgeId : '';
        AccessibilityInfo.announceForAccessibility('You earned ' + badgeName);
        emitBadgeEarned(
          getWixClientSingleton(),
          { badgeId, badgeName },
          { memberId },
        ).catch(() => {});
      } else if (event === 'tier_changed') {
        const newTier = typeof data.newTier === 'string' ? data.newTier : 'a new tier';
        AccessibilityInfo.announceForAccessibility('You reached ' + newTier);
      }

      handleGamificationPushEvent(data as GamificationPushPayload, {
        showBadgeToast: cb.showBadgeToast,
        showTierUpgradeModal: (_oldTier, newTier) => cb.reportTierChanged(newTier),
        showChallengeCompleteToast: (challengeName) =>
          cb.reportChallengesCompleted([
            { challengeId: challengeName, title: challengeName, rewardPoints: 0 },
          ]),
        showStreakMilestoneBanner: () =>
          cb.reportTriggers({
            milestoneUnlocked: true,
            badgeUnlocked: null,
            challengeCompleted: [],
            tierChanged: false,
            newTier: null,
            streakDanger: false,
          }),
      });
    });

    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
