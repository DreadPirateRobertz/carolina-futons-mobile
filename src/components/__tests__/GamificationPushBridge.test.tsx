/**
 * Tests for GamificationPushBridge — hq-1e63
 *
 * Verifies that incoming push notifications with gamification payloads are
 * routed to dispatchCrossRigPush (local notification scheduling) and
 * handleGamificationPushEvent (in-app UI callbacks).
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import * as Notifications from 'expo-notifications';
import { dispatchCrossRigPush } from '@/services/crossRigPushDispatch';
import { handleGamificationPushEvent } from '@/services/gamificationPushHandler';
import { GamificationPushBridge } from '../GamificationPushBridge';

jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(),
}));

jest.mock('@/services/crossRigPushDispatch', () => ({
  dispatchCrossRigPush: jest.fn().mockResolvedValue({ sent: 1, failed: 0 }),
}));

jest.mock('@/services/gamificationPushHandler', () => ({
  handleGamificationPushEvent: jest.fn(),
  GAMIFICATION_PUSH_EVENTS: {
    BADGE_EARNED: 'badge_earned',
    TIER_CHANGED: 'tier_changed',
    CHALLENGE_COMPLETE: 'challenge_complete',
    STREAK_MILESTONE: 'streak_milestone',
  },
}));

jest.mock('@/contexts/BadgeToastContext', () => ({
  useBadgeToastContext: () => ({ showBadgeToast: jest.fn() }),
}));

jest.mock('@/contexts/TriggerMomentsContext', () => ({
  useTriggerMomentsContext: () => ({
    reportTierChanged: jest.fn(),
    reportChallengesCompleted: jest.fn(),
    reportTriggers: jest.fn(),
  }),
}));

type ListenerCallback = (notification: {
  request: { content: { data: Record<string, unknown> } };
}) => void;

function setupListener(): {
  triggerPush: (data: Record<string, unknown>) => void;
  remove: jest.Mock;
} {
  const removeMock = jest.fn();
  let capturedCallback: ListenerCallback | null = null;

  (Notifications.addNotificationReceivedListener as jest.Mock).mockImplementation(
    (cb: ListenerCallback) => {
      capturedCallback = cb;
      return { remove: removeMock };
    },
  );

  return {
    triggerPush: (data: Record<string, unknown>) => {
      capturedCallback?.({ request: { content: { data } } });
    },
    remove: removeMock,
  };
}

describe('GamificationPushBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a notification received listener on mount', () => {
    setupListener();
    render(<GamificationPushBridge />);
    expect(Notifications.addNotificationReceivedListener).toHaveBeenCalledTimes(1);
  });

  it('removes the listener on unmount', () => {
    const { remove } = setupListener();
    const { unmount } = render(<GamificationPushBridge />);
    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('calls dispatchCrossRigPush when a badge_earned push arrives', () => {
    const { triggerPush } = setupListener();
    render(<GamificationPushBridge />);

    triggerPush({ event: 'badge_earned', memberId: 'member-1', badgeName: 'First AR' });

    expect(dispatchCrossRigPush).toHaveBeenCalledWith(
      'member-1',
      'badge_earned',
      expect.objectContaining({ event: 'badge_earned', badgeName: 'First AR' }),
    );
  });

  it('calls dispatchCrossRigPush when a tier_changed push arrives', () => {
    const { triggerPush } = setupListener();
    render(<GamificationPushBridge />);

    triggerPush({
      event: 'tier_changed',
      memberId: 'member-2',
      oldTier: 'bronze',
      newTier: 'silver',
    });

    expect(dispatchCrossRigPush).toHaveBeenCalledWith(
      'member-2',
      'tier_changed',
      expect.objectContaining({ oldTier: 'bronze', newTier: 'silver' }),
    );
  });

  it('calls handleGamificationPushEvent when a badge_earned push arrives', () => {
    const { triggerPush } = setupListener();
    render(<GamificationPushBridge />);

    triggerPush({
      event: 'badge_earned',
      memberId: 'member-1',
      badgeName: 'First AR',
      badgeId: 'ar-01',
    });

    expect(handleGamificationPushEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'badge_earned', badgeId: 'ar-01' }),
      expect.objectContaining({
        showBadgeToast: expect.any(Function),
        showTierUpgradeModal: expect.any(Function),
        showChallengeCompleteToast: expect.any(Function),
        showStreakMilestoneBanner: expect.any(Function),
      }),
    );
  });

  it('ignores pushes with no event field', () => {
    const { triggerPush } = setupListener();
    render(<GamificationPushBridge />);

    triggerPush({ someOtherField: 'value' });

    expect(dispatchCrossRigPush).not.toHaveBeenCalled();
    expect(handleGamificationPushEvent).not.toHaveBeenCalled();
  });

  it('uses empty string for memberId when absent from payload', () => {
    const { triggerPush } = setupListener();
    render(<GamificationPushBridge />);

    triggerPush({ event: 'badge_earned', badgeName: 'First AR', badgeId: 'ar-01' });

    expect(dispatchCrossRigPush).toHaveBeenCalledWith('', 'badge_earned', expect.anything());
  });

  describe('accessibility', () => {
    let announceSpy: jest.SpyInstance;

    beforeEach(() => {
      announceSpy = jest
        .spyOn(AccessibilityInfo, 'announceForAccessibility')
        .mockImplementation(() => {});
    });

    afterEach(() => {
      announceSpy.mockRestore();
    });

    it('announces badge_earned event to screen readers', () => {
      const { triggerPush } = setupListener();
      render(<GamificationPushBridge />);

      triggerPush({ event: 'badge_earned', memberId: 'member-1', badgeName: 'First AR' });

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        expect.stringContaining('First AR'),
      );
    });

    it('announces tier_changed event to screen readers', () => {
      const { triggerPush } = setupListener();
      render(<GamificationPushBridge />);

      triggerPush({ event: 'tier_changed', memberId: 'member-2', newTier: 'silver' });

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        expect.stringContaining('silver'),
      );
    });

    it('does not announce for events with no recognized event field', () => {
      const { triggerPush } = setupListener();
      render(<GamificationPushBridge />);

      triggerPush({ someOtherField: 'value' });

      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });

    it('does not announce for challenge_complete or streak_milestone (modal handles it)', () => {
      const { triggerPush } = setupListener();
      render(<GamificationPushBridge />);

      triggerPush({ event: 'challenge_complete', memberId: 'member-1', challengeName: 'AR Pro' });
      triggerPush({ event: 'streak_milestone', memberId: 'member-1' });

      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });
  });
});
