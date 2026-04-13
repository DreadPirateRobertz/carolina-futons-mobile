/**
 * TDD tests for crossRigSync.ts — cm-24e / cm-1at
 *
 * cm-24e: Typed interface + no-op stubs that establish the CFM → cf-0cx wiring contract.
 * cm-1at: Real typed wrappers after cf-ndr+cf-0cx merge. Tests cover:
 *   - completeMobileChallenge (all 3 challenge types, idempotency, error handling)
 *   - getMobileChallengeProgress (progress fetch, error handling)
 *   - sendPushToMember (BADGE_EARNED, TIER_CHANGED, push stub pattern)
 *   - MOBILE_CHALLENGE_TYPES (points + event name mapping)
 *   - PUSH_EVENTS constants
 *   - Updated sendCrossRigEvent / syncMobilePoints with real wixClient
 */

import {
  sendCrossRigEvent,
  syncMobilePoints,
  completeMobileChallenge,
  getMobileChallengeProgress,
  sendPushToMember,
  CROSS_RIG_SOURCE,
  MOBILE_CHALLENGE_TYPES,
  PUSH_EVENTS,
  type CrossRigEventType,
  type MobileChallengeType,
} from '../crossRigSync';

// ── Helpers ───────────────────────────────────────────────────────────────────

interface MockWixClient {
  callFunction: jest.Mock;
}

function makeMockWixClient(callFunctionImpl?: jest.Mock): MockWixClient {
  return {
    callFunction:
      callFunctionImpl ??
      jest.fn().mockResolvedValue({ success: true, alreadyAwarded: false, pointsAwarded: 75 }),
  };
}

// ── sendCrossRigEvent ─────────────────────────────────────────────────────────

describe('sendCrossRigEvent', () => {
  it('resolves without error for quiz_completed event', async () => {
    const wixClient = makeMockWixClient();
    await expect(
      sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', { score: 90 }),
    ).resolves.toBeUndefined();
  });

  it('resolves without error for ar_discovery_completed event', async () => {
    const wixClient = makeMockWixClient();
    await expect(
      sendCrossRigEvent(wixClient, 'member-1', 'ar_discovery_completed', {
        productId: 'asheville-full',
      }),
    ).resolves.toBeUndefined();
  });

  it('resolves without error for social_share_completed event', async () => {
    const wixClient = makeMockWixClient();
    await expect(
      sendCrossRigEvent(wixClient, 'member-1', 'social_share_completed', {
        platform: 'instagram',
      }),
    ).resolves.toBeUndefined();
  });

  it('resolves without error for badge_earned event', async () => {
    const wixClient = makeMockWixClient();
    await expect(
      sendCrossRigEvent(wixClient, 'member-1', 'badge_earned', { badgeId: 'first-purchase' }),
    ).resolves.toBeUndefined();
  });

  it('resolves without error for tier_changed event', async () => {
    const wixClient = makeMockWixClient();
    await expect(
      sendCrossRigEvent(wixClient, 'member-1', 'tier_changed', { tier: 'gold' }),
    ).resolves.toBeUndefined();
  });

  it('accepts an empty payload object', async () => {
    const wixClient = makeMockWixClient();
    await expect(
      sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', {}),
    ).resolves.toBeUndefined();
  });

  it('calls wixClient.callFunction with crossRigEventReceiver', async () => {
    const wixClient = makeMockWixClient();
    await sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', { score: 90 });
    expect(wixClient.callFunction).toHaveBeenCalledWith(
      'crossRigEventReceiver',
      'POST',
      expect.objectContaining({
        memberId: 'member-1',
        event: 'quiz_completed',
        sourceRig: CROSS_RIG_SOURCE,
      }),
    );
  });

  it('includes payload in the call body', async () => {
    const wixClient = makeMockWixClient();
    await sendCrossRigEvent(wixClient, 'member-1', 'badge_earned', { badgeId: 'vip' });
    expect(wixClient.callFunction).toHaveBeenCalledWith(
      'crossRigEventReceiver',
      'POST',
      expect.objectContaining({ payload: { badgeId: 'vip' } }),
    );
  });

  it('throws (or rejects) when memberId is empty string', async () => {
    const wixClient = makeMockWixClient();
    await expect(sendCrossRigEvent(wixClient, '', 'quiz_completed', {})).rejects.toThrow();
  });

  it('throws (or rejects) when memberId is whitespace only', async () => {
    const wixClient = makeMockWixClient();
    await expect(sendCrossRigEvent(wixClient, '   ', 'quiz_completed', {})).rejects.toThrow();
  });

  it('propagates wixClient.callFunction rejection', async () => {
    const wixClient = makeMockWixClient(
      jest.fn().mockRejectedValue(new Error('[crossRigSync] network error')),
    );
    await expect(sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', {})).rejects.toThrow(
      '[crossRigSync] network error',
    );
  });
});

// ── syncMobilePoints ──────────────────────────────────────────────────────────

describe('syncMobilePoints', () => {
  it('resolves without error for valid positive points', async () => {
    const wixClient = makeMockWixClient();
    await expect(
      syncMobilePoints(wixClient, 'member-1', 100, 'quiz_completed'),
    ).resolves.toBeUndefined();
  });

  it('resolves without error for zero points', async () => {
    const wixClient = makeMockWixClient();
    await expect(
      syncMobilePoints(wixClient, 'member-1', 0, 'quiz_completed'),
    ).resolves.toBeUndefined();
  });

  it('rejects when points are negative', async () => {
    const wixClient = makeMockWixClient();
    await expect(syncMobilePoints(wixClient, 'member-1', -1, 'quiz_completed')).rejects.toThrow();
  });

  it('rejects when points are a large negative number', async () => {
    const wixClient = makeMockWixClient();
    await expect(
      syncMobilePoints(wixClient, 'member-1', -9999, 'ar_discovery_completed'),
    ).rejects.toThrow();
  });

  it('rejects when memberId is empty string', async () => {
    const wixClient = makeMockWixClient();
    await expect(syncMobilePoints(wixClient, '', 100, 'quiz_completed')).rejects.toThrow();
  });

  it('resolves for ar_discovery_completed eventType', async () => {
    const wixClient = makeMockWixClient();
    await expect(
      syncMobilePoints(wixClient, 'member-1', 50, 'ar_discovery_completed'),
    ).resolves.toBeUndefined();
  });

  it('resolves for social_share_completed eventType', async () => {
    const wixClient = makeMockWixClient();
    await expect(
      syncMobilePoints(wixClient, 'member-1', 25, 'social_share_completed'),
    ).resolves.toBeUndefined();
  });

  it('resolves for badge_earned eventType', async () => {
    const wixClient = makeMockWixClient();
    await expect(
      syncMobilePoints(wixClient, 'member-1', 0, 'badge_earned'),
    ).resolves.toBeUndefined();
  });

  it('calls wixClient.callFunction with crossRigEventReceiver', async () => {
    const wixClient = makeMockWixClient();
    await syncMobilePoints(wixClient, 'member-1', 50, 'quiz_completed');
    expect(wixClient.callFunction).toHaveBeenCalledWith(
      'crossRigEventReceiver',
      'POST',
      expect.objectContaining({
        memberId: 'member-1',
        sourceRig: CROSS_RIG_SOURCE,
      }),
    );
  });
});

// ── completeMobileChallenge ───────────────────────────────────────────────────

describe('completeMobileChallenge', () => {
  describe('ar_discovery', () => {
    it('returns success:true and pointsAwarded:75', async () => {
      const wixClient = makeMockWixClient(
        jest.fn().mockResolvedValue({ success: true, alreadyAwarded: false, pointsAwarded: 75 }),
      );
      const result = await completeMobileChallenge(wixClient, 'member-1', 'ar_discovery', {
        productId: 'asheville-full',
      });
      expect(result).toEqual({ success: true, alreadyAwarded: false, pointsAwarded: 75 });
    });

    it('calls wixClient.callFunction with ar_discovery_completed event', async () => {
      const wixClient = makeMockWixClient(
        jest.fn().mockResolvedValue({ success: true, alreadyAwarded: false, pointsAwarded: 75 }),
      );
      await completeMobileChallenge(wixClient, 'member-1', 'ar_discovery', {
        productId: 'asheville-full',
      });
      expect(wixClient.callFunction).toHaveBeenCalledWith(
        'completeMobileChallenge',
        'POST',
        expect.objectContaining({
          memberId: 'member-1',
          event: 'ar_discovery_completed',
          sourceRig: CROSS_RIG_SOURCE,
        }),
      );
    });

    it('includes productId in the call params', async () => {
      const wixClient = makeMockWixClient(
        jest.fn().mockResolvedValue({ success: true, alreadyAwarded: false, pointsAwarded: 75 }),
      );
      await completeMobileChallenge(wixClient, 'member-1', 'ar_discovery', {
        productId: 'asheville-full',
      });
      expect(wixClient.callFunction).toHaveBeenCalledWith(
        'completeMobileChallenge',
        'POST',
        expect.objectContaining({
          params: expect.objectContaining({ productId: 'asheville-full' }),
        }),
      );
    });
  });

  describe('quiz_completion', () => {
    it('calls wixClient with quiz_completed event', async () => {
      const wixClient = makeMockWixClient(
        jest.fn().mockResolvedValue({ success: true, alreadyAwarded: false, pointsAwarded: 50 }),
      );
      await completeMobileChallenge(wixClient, 'member-1', 'quiz_completion', { score: 90 });
      expect(wixClient.callFunction).toHaveBeenCalledWith(
        'completeMobileChallenge',
        'POST',
        expect.objectContaining({ event: 'quiz_completed' }),
      );
    });

    it('returns pointsAwarded:50 for quiz_completion', async () => {
      const wixClient = makeMockWixClient(
        jest.fn().mockResolvedValue({ success: true, alreadyAwarded: false, pointsAwarded: 50 }),
      );
      const result = await completeMobileChallenge(wixClient, 'member-1', 'quiz_completion', {
        score: 90,
      });
      expect(result.pointsAwarded).toBe(50);
    });
  });

  describe('social_share', () => {
    it('calls wixClient with social_share_completed event', async () => {
      const wixClient = makeMockWixClient(
        jest.fn().mockResolvedValue({ success: true, alreadyAwarded: false, pointsAwarded: 100 }),
      );
      await completeMobileChallenge(wixClient, 'member-1', 'social_share', {
        platform: 'instagram',
      });
      expect(wixClient.callFunction).toHaveBeenCalledWith(
        'completeMobileChallenge',
        'POST',
        expect.objectContaining({ event: 'social_share_completed' }),
      );
    });
  });

  describe('idempotency', () => {
    it('returns alreadyAwarded:true and pointsAwarded:0 when server reports alreadyAwarded', async () => {
      const wixClient = makeMockWixClient(
        jest.fn().mockResolvedValue({ success: true, alreadyAwarded: true, pointsAwarded: 0 }),
      );
      const result = await completeMobileChallenge(wixClient, 'member-1', 'ar_discovery', {
        productId: 'asheville-full',
      });
      expect(result.alreadyAwarded).toBe(true);
      expect(result.pointsAwarded).toBe(0);
    });

    it('passes params to the server so it can apply productId+day idempotency', async () => {
      const wixClient = makeMockWixClient(
        jest.fn().mockResolvedValue({ success: true, alreadyAwarded: false, pointsAwarded: 75 }),
      );
      await completeMobileChallenge(wixClient, 'member-1', 'ar_discovery', {
        productId: 'asheville-full',
      });
      const [, , body] = wixClient.callFunction.mock.calls[0] as [
        string,
        string,
        Record<string, unknown>,
      ];
      expect((body.params as Record<string, unknown>).productId).toBe('asheville-full');
    });
  });

  describe('error handling', () => {
    it('propagates wixClient.callFunction rejection', async () => {
      const wixClient = makeMockWixClient(
        jest.fn().mockRejectedValue(new Error('[completeMobileChallenge] network error')),
      );
      await expect(
        completeMobileChallenge(wixClient, 'member-1', 'ar_discovery', {}),
      ).rejects.toThrow('[completeMobileChallenge] network error');
    });

    it('rejects when memberId is empty', async () => {
      const wixClient = makeMockWixClient();
      await expect(completeMobileChallenge(wixClient, '', 'ar_discovery', {})).rejects.toThrow();
    });

    it('rejects when memberId is whitespace', async () => {
      const wixClient = makeMockWixClient();
      await expect(
        completeMobileChallenge(wixClient, '   ', 'quiz_completion', {}),
      ).rejects.toThrow();
    });
  });

  describe('empty params', () => {
    it('resolves when params object is empty', async () => {
      const wixClient = makeMockWixClient(
        jest.fn().mockResolvedValue({ success: true, alreadyAwarded: false, pointsAwarded: 50 }),
      );
      await expect(
        completeMobileChallenge(wixClient, 'member-1', 'quiz_completion', {}),
      ).resolves.toEqual({ success: true, alreadyAwarded: false, pointsAwarded: 50 });
    });
  });
});

// ── getMobileChallengeProgress ────────────────────────────────────────────────

describe('getMobileChallengeProgress', () => {
  it('calls wixClient.callFunction to fetch progress', async () => {
    const wixClient = makeMockWixClient(
      jest.fn().mockResolvedValue({
        success: true,
        counts: { ar_discovery: 2, quiz_completion: 1, social_share: 0 },
      }),
    );
    await getMobileChallengeProgress(wixClient, 'member-1');
    expect(wixClient.callFunction).toHaveBeenCalledWith(
      'getMobileChallengeProgress',
      'GET',
      expect.objectContaining({ memberId: 'member-1' }),
    );
  });

  it('returns parsed counts', async () => {
    const wixClient = makeMockWixClient(
      jest.fn().mockResolvedValue({
        success: true,
        counts: { ar_discovery: 3, quiz_completion: 2, social_share: 1 },
      }),
    );
    const result = await getMobileChallengeProgress(wixClient, 'member-1');
    expect(result.counts.ar_discovery).toBe(3);
    expect(result.counts.quiz_completion).toBe(2);
    expect(result.counts.social_share).toBe(1);
  });

  it('returns success:true on successful fetch', async () => {
    const wixClient = makeMockWixClient(
      jest.fn().mockResolvedValue({
        success: true,
        counts: { ar_discovery: 0, quiz_completion: 0, social_share: 0 },
      }),
    );
    const result = await getMobileChallengeProgress(wixClient, 'member-1');
    expect(result.success).toBe(true);
  });

  it('propagates wixClient errors', async () => {
    const wixClient = makeMockWixClient(
      jest.fn().mockRejectedValue(new Error('[getMobileChallengeProgress] fetch failed')),
    );
    await expect(getMobileChallengeProgress(wixClient, 'member-1')).rejects.toThrow(
      '[getMobileChallengeProgress] fetch failed',
    );
  });

  it('rejects when memberId is empty', async () => {
    const wixClient = makeMockWixClient();
    await expect(getMobileChallengeProgress(wixClient, '')).rejects.toThrow();
  });
});

// ── sendPushToMember ──────────────────────────────────────────────────────────

describe('sendPushToMember', () => {
  it('calls wixClient.callFunction with sendPushToMember for BADGE_EARNED', async () => {
    const wixClient = makeMockWixClient(jest.fn().mockResolvedValue({ sent: 1, failed: 0 }));
    await sendPushToMember(wixClient, 'member-1', 'BADGE_EARNED', { badgeId: 'first-purchase' });
    expect(wixClient.callFunction).toHaveBeenCalledWith(
      'sendPushToMember',
      'POST',
      expect.objectContaining({
        memberId: 'member-1',
        event: PUSH_EVENTS.BADGE_EARNED,
        payload: { badgeId: 'first-purchase' },
      }),
    );
  });

  it('calls wixClient.callFunction for TIER_CHANGED', async () => {
    const wixClient = makeMockWixClient(jest.fn().mockResolvedValue({ sent: 1, failed: 0 }));
    await sendPushToMember(wixClient, 'member-1', 'TIER_CHANGED', { tier: 'gold' });
    expect(wixClient.callFunction).toHaveBeenCalledWith(
      'sendPushToMember',
      'POST',
      expect.objectContaining({ event: PUSH_EVENTS.TIER_CHANGED }),
    );
  });

  it('returns the stub result { sent: N, failed: 0 }', async () => {
    const wixClient = makeMockWixClient(jest.fn().mockResolvedValue({ sent: 1, failed: 0 }));
    const result = await sendPushToMember(wixClient, 'member-1', 'BADGE_EARNED', {});
    expect(result).toEqual({ sent: 1, failed: 0 });
  });

  it('propagates wixClient errors', async () => {
    const wixClient = makeMockWixClient(
      jest.fn().mockRejectedValue(new Error('[sendPushToMember] push failed')),
    );
    await expect(sendPushToMember(wixClient, 'member-1', 'BADGE_EARNED', {})).rejects.toThrow(
      '[sendPushToMember] push failed',
    );
  });

  it('rejects when memberId is empty', async () => {
    const wixClient = makeMockWixClient(jest.fn().mockResolvedValue({ sent: 1, failed: 0 }));
    await expect(sendPushToMember(wixClient, '', 'BADGE_EARNED', {})).rejects.toThrow();
  });
});

// ── CROSS_RIG_SOURCE constant ─────────────────────────────────────────────────

describe('CROSS_RIG_SOURCE', () => {
  it('is always cfutons_mobile', () => {
    expect(CROSS_RIG_SOURCE).toBe('cfutons_mobile');
  });
});

// ── MOBILE_CHALLENGE_TYPES ────────────────────────────────────────────────────

describe('MOBILE_CHALLENGE_TYPES', () => {
  it('ar_discovery awards 75 points', () => {
    expect(MOBILE_CHALLENGE_TYPES.ar_discovery.points).toBe(75);
  });

  it('quiz_completion awards 50 points', () => {
    expect(MOBILE_CHALLENGE_TYPES.quiz_completion.points).toBe(50);
  });

  it('social_share awards 100 points', () => {
    expect(MOBILE_CHALLENGE_TYPES.social_share.points).toBe(100);
  });

  it('ar_discovery maps to ar_discovery_completed event', () => {
    expect(MOBILE_CHALLENGE_TYPES.ar_discovery.eventName).toBe('ar_discovery_completed');
  });

  it('quiz_completion maps to quiz_completed event', () => {
    expect(MOBILE_CHALLENGE_TYPES.quiz_completion.eventName).toBe('quiz_completed');
  });

  it('social_share maps to social_share_completed event', () => {
    expect(MOBILE_CHALLENGE_TYPES.social_share.eventName).toBe('social_share_completed');
  });
});

// ── PUSH_EVENTS ───────────────────────────────────────────────────────────────

describe('PUSH_EVENTS', () => {
  it('BADGE_EARNED is badge_earned', () => {
    expect(PUSH_EVENTS.BADGE_EARNED).toBe('badge_earned');
  });

  it('TIER_CHANGED is tier_changed', () => {
    expect(PUSH_EVENTS.TIER_CHANGED).toBe('tier_changed');
  });
});

// ── CrossRigEventType union ───────────────────────────────────────────────────

describe('CrossRigEventType — type contract', () => {
  it('includes all five expected event types', () => {
    const events: CrossRigEventType[] = [
      'quiz_completed',
      'ar_discovery_completed',
      'social_share_completed',
      'badge_earned',
      'tier_changed',
    ];
    expect(events).toHaveLength(5);
  });
});

// ── MobileChallengeType union ─────────────────────────────────────────────────

describe('MobileChallengeType — type contract', () => {
  it('includes all three challenge types', () => {
    const types: MobileChallengeType[] = ['ar_discovery', 'quiz_completion', 'social_share'];
    expect(types).toHaveLength(3);
  });
});
