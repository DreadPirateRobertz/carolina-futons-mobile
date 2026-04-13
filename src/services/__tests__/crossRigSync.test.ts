/**
 * TDD tests for crossRigSync.ts — cm-24e
 *
 * Typed interface + no-op stubs that establish the CFM → cf-0cx wiring contract.
 * Tests verify: type safety, points>=0 guard, sourceRig always 'cfutons_mobile',
 * and correct event/payload shapes.
 *
 * All functions are no-ops that resolve immediately — these tests document the
 * contract that the real implementation (cf-0cx) must satisfy.
 */

import {
  sendCrossRigEvent,
  syncMobilePoints,
  CROSS_RIG_SOURCE,
  CrossRigEventType,
} from '../crossRigSync';

// ── sendCrossRigEvent ─────────────────────────────────────────────────────────

describe('sendCrossRigEvent', () => {
  it('resolves without error for quiz_completed event', async () => {
    await expect(
      sendCrossRigEvent('member-1', 'quiz_completed', { score: 90 }),
    ).resolves.toBeUndefined();
  });

  it('resolves without error for ar_discovery_completed event', async () => {
    await expect(
      sendCrossRigEvent('member-1', 'ar_discovery_completed', { productId: 'asheville-full' }),
    ).resolves.toBeUndefined();
  });

  it('resolves without error for social_share_completed event', async () => {
    await expect(
      sendCrossRigEvent('member-1', 'social_share_completed', { platform: 'instagram' }),
    ).resolves.toBeUndefined();
  });

  it('resolves without error for badge_earned event', async () => {
    await expect(
      sendCrossRigEvent('member-1', 'badge_earned', { badgeId: 'first-purchase' }),
    ).resolves.toBeUndefined();
  });

  it('resolves without error for tier_changed event', async () => {
    await expect(
      sendCrossRigEvent('member-1', 'tier_changed', { tier: 'gold' }),
    ).resolves.toBeUndefined();
  });

  it('accepts an empty payload object', async () => {
    await expect(sendCrossRigEvent('member-1', 'quiz_completed', {})).resolves.toBeUndefined();
  });

  it('throws (or rejects) when memberId is empty string', async () => {
    await expect(sendCrossRigEvent('', 'quiz_completed', {})).rejects.toThrow();
  });

  it('throws (or rejects) when memberId is whitespace only', async () => {
    await expect(sendCrossRigEvent('   ', 'quiz_completed', {})).rejects.toThrow();
  });
});

// ── syncMobilePoints ──────────────────────────────────────────────────────────

describe('syncMobilePoints', () => {
  it('resolves without error for valid positive points', async () => {
    await expect(syncMobilePoints('member-1', 100, 'quiz_completed')).resolves.toBeUndefined();
  });

  it('resolves without error for zero points', async () => {
    await expect(syncMobilePoints('member-1', 0, 'quiz_completed')).resolves.toBeUndefined();
  });

  it('rejects when points are negative', async () => {
    await expect(syncMobilePoints('member-1', -1, 'quiz_completed')).rejects.toThrow();
  });

  it('rejects when points are a large negative number', async () => {
    await expect(syncMobilePoints('member-1', -9999, 'ar_discovery_completed')).rejects.toThrow();
  });

  it('rejects when memberId is empty string', async () => {
    await expect(syncMobilePoints('', 100, 'quiz_completed')).rejects.toThrow();
  });

  it('resolves for ar_discovery_completed eventType', async () => {
    await expect(
      syncMobilePoints('member-1', 50, 'ar_discovery_completed'),
    ).resolves.toBeUndefined();
  });

  it('resolves for social_share_completed eventType', async () => {
    await expect(
      syncMobilePoints('member-1', 25, 'social_share_completed'),
    ).resolves.toBeUndefined();
  });

  it('resolves for badge_earned eventType', async () => {
    await expect(syncMobilePoints('member-1', 0, 'badge_earned')).resolves.toBeUndefined();
  });
});

// ── CROSS_RIG_SOURCE constant ─────────────────────────────────────────────────

describe('CROSS_RIG_SOURCE', () => {
  it('is always cfutons_mobile', () => {
    expect(CROSS_RIG_SOURCE).toBe('cfutons_mobile');
  });
});

// ── CrossRigEventType union ───────────────────────────────────────────────────

describe('CrossRigEventType — type contract', () => {
  it('includes all five expected event types', () => {
    // Type-level test: if CrossRigEventType is wrong these lines won't compile.
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
