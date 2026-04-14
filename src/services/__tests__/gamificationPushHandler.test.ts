/**
 * TDD tests for gamificationPushHandler.
 *
 * The handler consumes crossRigEventReceiver push events (badge_earned,
 * tier_changed, challenge_complete, streak_milestone) and routes them to
 * in-app UI actions via injectable action callbacks.
 *
 * @bead cm-6ws
 */

import {
  handleGamificationPushEvent,
  GAMIFICATION_PUSH_EVENTS,
  type GamificationPushPayload,
  type GamificationPushActions,
} from '../gamificationPushHandler';

// ── Mock action callbacks ─────────────────────────────────────────────────────

function makeActions(): jest.Mocked<GamificationPushActions> {
  return {
    showBadgeToast: jest.fn(),
    showTierUpgradeModal: jest.fn(),
    showChallengeCompleteToast: jest.fn(),
    showStreakMilestoneBanner: jest.fn(),
  };
}

// ── GAMIFICATION_PUSH_EVENTS constants ────────────────────────────────────────

describe('GAMIFICATION_PUSH_EVENTS', () => {
  it('exports BADGE_EARNED constant', () => {
    expect(GAMIFICATION_PUSH_EVENTS.BADGE_EARNED).toBe('badge_earned');
  });

  it('exports TIER_CHANGED constant', () => {
    expect(GAMIFICATION_PUSH_EVENTS.TIER_CHANGED).toBe('tier_changed');
  });

  it('exports CHALLENGE_COMPLETE constant', () => {
    expect(GAMIFICATION_PUSH_EVENTS.CHALLENGE_COMPLETE).toBe('challenge_complete');
  });

  it('exports STREAK_MILESTONE constant', () => {
    expect(GAMIFICATION_PUSH_EVENTS.STREAK_MILESTONE).toBe('streak_milestone');
  });
});

// ── badge_earned → badge toast ────────────────────────────────────────────────

describe('badge_earned event', () => {
  it('calls showBadgeToast with badgeName from payload', () => {
    const actions = makeActions();
    const payload: GamificationPushPayload = {
      event: 'badge_earned',
      badgeName: 'Sofa Champion',
      badgeId: 'badge-sofa-champ',
    };
    handleGamificationPushEvent(payload, actions);
    expect(actions.showBadgeToast).toHaveBeenCalledTimes(1);
    expect(actions.showBadgeToast).toHaveBeenCalledWith('Sofa Champion');
  });

  it('does NOT call other action handlers for badge_earned', () => {
    const actions = makeActions();
    handleGamificationPushEvent(
      { event: 'badge_earned', badgeName: 'Test Badge', badgeId: 'b1' },
      actions,
    );
    expect(actions.showTierUpgradeModal).not.toHaveBeenCalled();
    expect(actions.showChallengeCompleteToast).not.toHaveBeenCalled();
    expect(actions.showStreakMilestoneBanner).not.toHaveBeenCalled();
  });

  it('handles badge_earned with missing badgeName gracefully — falls back to empty string', () => {
    const actions = makeActions();
    // Simulate malformed payload with missing badgeName
    const payload = { event: 'badge_earned', badgeId: 'b1' } as unknown as GamificationPushPayload;
    expect(() => handleGamificationPushEvent(payload, actions)).not.toThrow();
    expect(actions.showBadgeToast).toHaveBeenCalledWith('');
  });

  it('handles badge_earned with null badgeName gracefully', () => {
    const actions = makeActions();
    const payload = {
      event: 'badge_earned',
      badgeName: null,
      badgeId: 'b1',
    } as unknown as GamificationPushPayload;
    expect(() => handleGamificationPushEvent(payload, actions)).not.toThrow();
    expect(actions.showBadgeToast).toHaveBeenCalledWith('');
  });
});

// ── tier_changed → tier upgrade modal ────────────────────────────────────────

describe('tier_changed event', () => {
  it('calls showTierUpgradeModal with oldTier and newTier', () => {
    const actions = makeActions();
    const payload: GamificationPushPayload = {
      event: 'tier_changed',
      oldTier: 'Trail Blazer',
      newTier: 'Mountain Guide',
    };
    handleGamificationPushEvent(payload, actions);
    expect(actions.showTierUpgradeModal).toHaveBeenCalledTimes(1);
    expect(actions.showTierUpgradeModal).toHaveBeenCalledWith('Trail Blazer', 'Mountain Guide');
  });

  it('does NOT call other action handlers for tier_changed', () => {
    const actions = makeActions();
    handleGamificationPushEvent(
      { event: 'tier_changed', oldTier: 'Trail Blazer', newTier: 'Mountain Guide' },
      actions,
    );
    expect(actions.showBadgeToast).not.toHaveBeenCalled();
    expect(actions.showChallengeCompleteToast).not.toHaveBeenCalled();
    expect(actions.showStreakMilestoneBanner).not.toHaveBeenCalled();
  });

  it('handles tier_changed with missing newTier gracefully', () => {
    const actions = makeActions();
    const payload = {
      event: 'tier_changed',
      oldTier: 'Trail Blazer',
    } as unknown as GamificationPushPayload;
    expect(() => handleGamificationPushEvent(payload, actions)).not.toThrow();
    expect(actions.showTierUpgradeModal).toHaveBeenCalledWith('Trail Blazer', '');
  });

  it('handles tier_changed with missing oldTier gracefully', () => {
    const actions = makeActions();
    const payload = {
      event: 'tier_changed',
      newTier: 'Mountain Guide',
    } as unknown as GamificationPushPayload;
    expect(() => handleGamificationPushEvent(payload, actions)).not.toThrow();
    expect(actions.showTierUpgradeModal).toHaveBeenCalledWith('', 'Mountain Guide');
  });
});

// ── challenge_complete → toast/banner ────────────────────────────────────────

describe('challenge_complete event', () => {
  it('calls showChallengeCompleteToast with challengeName from payload', () => {
    const actions = makeActions();
    const payload: GamificationPushPayload = {
      event: 'challenge_complete',
      challengeName: 'Spring Refresh',
      challengeId: 'ch-spring-2026',
    };
    handleGamificationPushEvent(payload, actions);
    expect(actions.showChallengeCompleteToast).toHaveBeenCalledTimes(1);
    expect(actions.showChallengeCompleteToast).toHaveBeenCalledWith('Spring Refresh');
  });

  it('does NOT call other action handlers for challenge_complete', () => {
    const actions = makeActions();
    handleGamificationPushEvent(
      { event: 'challenge_complete', challengeName: 'Test', challengeId: 'c1' },
      actions,
    );
    expect(actions.showBadgeToast).not.toHaveBeenCalled();
    expect(actions.showTierUpgradeModal).not.toHaveBeenCalled();
    expect(actions.showStreakMilestoneBanner).not.toHaveBeenCalled();
  });

  it('handles challenge_complete with missing challengeName gracefully', () => {
    const actions = makeActions();
    const payload = {
      event: 'challenge_complete',
      challengeId: 'c1',
    } as unknown as GamificationPushPayload;
    expect(() => handleGamificationPushEvent(payload, actions)).not.toThrow();
    expect(actions.showChallengeCompleteToast).toHaveBeenCalledWith('');
  });
});

// ── streak_milestone → streak milestone banner ────────────────────────────────

describe('streak_milestone event', () => {
  it('calls showStreakMilestoneBanner with streakCount from payload', () => {
    const actions = makeActions();
    const payload: GamificationPushPayload = {
      event: 'streak_milestone',
      streakCount: 7,
    };
    handleGamificationPushEvent(payload, actions);
    expect(actions.showStreakMilestoneBanner).toHaveBeenCalledTimes(1);
    expect(actions.showStreakMilestoneBanner).toHaveBeenCalledWith(7);
  });

  it('does NOT call other action handlers for streak_milestone', () => {
    const actions = makeActions();
    handleGamificationPushEvent({ event: 'streak_milestone', streakCount: 14 }, actions);
    expect(actions.showBadgeToast).not.toHaveBeenCalled();
    expect(actions.showTierUpgradeModal).not.toHaveBeenCalled();
    expect(actions.showChallengeCompleteToast).not.toHaveBeenCalled();
  });

  it('handles streak_milestone with missing streakCount gracefully — falls back to 0', () => {
    const actions = makeActions();
    const payload = { event: 'streak_milestone' } as unknown as GamificationPushPayload;
    expect(() => handleGamificationPushEvent(payload, actions)).not.toThrow();
    expect(actions.showStreakMilestoneBanner).toHaveBeenCalledWith(0);
  });

  it('handles streak_milestone with non-numeric streakCount gracefully', () => {
    const actions = makeActions();
    const payload = {
      event: 'streak_milestone',
      streakCount: 'not-a-number',
    } as unknown as GamificationPushPayload;
    expect(() => handleGamificationPushEvent(payload, actions)).not.toThrow();
    expect(actions.showStreakMilestoneBanner).toHaveBeenCalledWith(0);
  });
});

// ── Unknown event type ────────────────────────────────────────────────────────

describe('unknown event type', () => {
  it('is a no-op — no action handlers called', () => {
    const actions = makeActions();
    const payload = { event: 'totally_unknown_event' } as unknown as GamificationPushPayload;
    expect(() => handleGamificationPushEvent(payload, actions)).not.toThrow();
    expect(actions.showBadgeToast).not.toHaveBeenCalled();
    expect(actions.showTierUpgradeModal).not.toHaveBeenCalled();
    expect(actions.showChallengeCompleteToast).not.toHaveBeenCalled();
    expect(actions.showStreakMilestoneBanner).not.toHaveBeenCalled();
  });

  it('handles empty string event type without crashing', () => {
    const actions = makeActions();
    const payload = { event: '' } as unknown as GamificationPushPayload;
    expect(() => handleGamificationPushEvent(payload, actions)).not.toThrow();
  });
});

// ── Malformed payload ─────────────────────────────────────────────────────────

describe('malformed payload', () => {
  it('does not throw when payload has no event field', () => {
    const actions = makeActions();
    const payload = { badgeId: 'b1' } as unknown as GamificationPushPayload;
    expect(() => handleGamificationPushEvent(payload, actions)).not.toThrow();
  });

  it('does not throw when payload is an empty object', () => {
    const actions = makeActions();
    expect(() =>
      handleGamificationPushEvent({} as unknown as GamificationPushPayload, actions),
    ).not.toThrow();
  });

  it('does not throw when payload has numeric event field', () => {
    const actions = makeActions();
    const payload = { event: 42 } as unknown as GamificationPushPayload;
    expect(() => handleGamificationPushEvent(payload, actions)).not.toThrow();
  });
});

// ── Full round-trip: all 4 event types ───────────────────────────────────────

describe('all 4 event types — round-trip', () => {
  const scenarios: Array<{ label: string; payload: GamificationPushPayload; handler: keyof GamificationPushActions }> = [
    {
      label: 'badge_earned → showBadgeToast',
      payload: { event: 'badge_earned', badgeName: 'Gold', badgeId: 'b-gold' },
      handler: 'showBadgeToast',
    },
    {
      label: 'tier_changed → showTierUpgradeModal',
      payload: { event: 'tier_changed', oldTier: 'Trail Blazer', newTier: 'Summit Master' },
      handler: 'showTierUpgradeModal',
    },
    {
      label: 'challenge_complete → showChallengeCompleteToast',
      payload: { event: 'challenge_complete', challengeName: 'Spring Refresh', challengeId: 'c1' },
      handler: 'showChallengeCompleteToast',
    },
    {
      label: 'streak_milestone → showStreakMilestoneBanner',
      payload: { event: 'streak_milestone', streakCount: 30 },
      handler: 'showStreakMilestoneBanner',
    },
  ];

  scenarios.forEach(({ label, payload, handler }) => {
    it(`${label}`, () => {
      const actions = makeActions();
      handleGamificationPushEvent(payload, actions);
      expect(actions[handler]).toHaveBeenCalledTimes(1);
    });
  });
});
