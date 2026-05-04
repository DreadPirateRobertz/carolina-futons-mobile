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
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { dispatchCrossRigPush } from '@/services/crossRigPushDispatch';
import {
  handleGamificationPushEvent,
  type GamificationPushPayload,
} from '@/services/gamificationPushHandler';
import { useBadgeToastContext } from '@/contexts/BadgeToastContext';
import { useTriggerMomentsContext } from '@/contexts/TriggerMomentsContext';

export function GamificationPushBridge() {
  const { showBadgeToast } = useBadgeToastContext();
  const { reportTierChanged, reportChallengesCompleted, reportTriggers } =
    useTriggerMomentsContext();

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
      const event = typeof data.event === 'string' ? data.event : undefined;
      if (!event) return;

      const memberId = typeof data.memberId === 'string' ? data.memberId : '';

      dispatchCrossRigPush(memberId, event, data);

      handleGamificationPushEvent(data as GamificationPushPayload, {
        showBadgeToast,
        showTierUpgradeModal: (_oldTier, newTier) => reportTierChanged(newTier),
        showChallengeCompleteToast: (challengeName) =>
          reportChallengesCompleted([
            { challengeId: challengeName, title: challengeName, rewardPoints: 0 },
          ]),
        showStreakMilestoneBanner: () =>
          reportTriggers({
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
  }, [showBadgeToast, reportTierChanged, reportChallengesCompleted, reportTriggers]);

  return null;
}
