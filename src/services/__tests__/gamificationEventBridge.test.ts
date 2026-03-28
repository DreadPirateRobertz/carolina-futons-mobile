/**
 * Tests for gamificationEventBridge — cf-3izx
 *
 * GamificationEventBridge receives cross-rig gamification events from the web
 * layer and translates them into mobile push notification payloads.
 */

import { handleGamificationEvent, type GamificationEvent } from '../gamificationEventBridge';

// ── Mock sendPushNotification ─────────────────────────────────────────────────

const mockSendPush = jest.fn(() => Promise.resolve());

beforeEach(() => {
  jest.clearAllMocks();
  mockSendPush.mockResolvedValue(undefined);
});

// Helper: call with injectable sendPush
function handle(event: GamificationEvent) {
  return handleGamificationEvent(event, mockSendPush);
}

// ── gamification_badge_awarded ────────────────────────────────────────────────

describe('gamification_badge_awarded', () => {
  const base = {
    type: 'gamification_badge_awarded' as const,
    memberId: 'member-123',
    badgeId: 'badge-abc',
    badgeLabel: 'Early Adopter',
  };

  it('sends push with correct title and body', async () => {
    const result = await handle(base);
    expect(result).toEqual({ sent: true, type: 'gamification_badge_awarded' });
    expect(mockSendPush).toHaveBeenCalledTimes(1);
    expect(mockSendPush).toHaveBeenCalledWith(
      'member-123',
      expect.objectContaining({
        title: expect.stringContaining('Early Adopter'),
        body: expect.any(String),
        data: { type: 'gamification_badge_awarded', memberId: 'member-123' },
      }),
    );
  });

  it('returns error when memberId is missing', async () => {
    const result = await handle({ ...base, memberId: '' });
    expect(result).toMatchObject({ error: expect.any(String) });
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('returns error when badgeId is missing', async () => {
    const result = await handle({ ...base, badgeId: '' });
    expect(result).toMatchObject({ error: expect.any(String) });
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('returns error when badgeLabel is missing', async () => {
    const result = await handle({ ...base, badgeLabel: '' });
    expect(result).toMatchObject({ error: expect.any(String) });
    expect(mockSendPush).not.toHaveBeenCalled();
  });
});

// ── gamification_tier_upgrade ─────────────────────────────────────────────────

describe('gamification_tier_upgrade', () => {
  const base = {
    type: 'gamification_tier_upgrade' as const,
    memberId: 'member-456',
    prevTier: 'Bronze',
    newTier: 'Silver',
  };

  it('sends push with correct title and body', async () => {
    const result = await handle(base);
    expect(result).toEqual({ sent: true, type: 'gamification_tier_upgrade' });
    expect(mockSendPush).toHaveBeenCalledTimes(1);
    expect(mockSendPush).toHaveBeenCalledWith(
      'member-456',
      expect.objectContaining({
        title: expect.stringContaining('Silver'),
        body: expect.any(String),
        data: { type: 'gamification_tier_upgrade', memberId: 'member-456' },
      }),
    );
  });

  it('returns error when memberId is missing', async () => {
    const result = await handle({ ...base, memberId: '' });
    expect(result).toMatchObject({ error: expect.any(String) });
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('returns error when newTier is missing', async () => {
    const result = await handle({ ...base, newTier: '' });
    expect(result).toMatchObject({ error: expect.any(String) });
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('returns error when prevTier is missing', async () => {
    const result = await handle({ ...base, prevTier: '' });
    expect(result).toMatchObject({ error: expect.any(String) });
    expect(mockSendPush).not.toHaveBeenCalled();
  });
});

// ── gamification_points_milestone ─────────────────────────────────────────────

describe('gamification_points_milestone', () => {
  const base = {
    type: 'gamification_points_milestone' as const,
    memberId: 'member-789',
    points: 500,
  };

  it('sends push with correct title and body', async () => {
    const result = await handle(base);
    expect(result).toEqual({ sent: true, type: 'gamification_points_milestone' });
    expect(mockSendPush).toHaveBeenCalledTimes(1);
    expect(mockSendPush).toHaveBeenCalledWith(
      'member-789',
      expect.objectContaining({
        body: expect.stringContaining('500'),
        data: { type: 'gamification_points_milestone', memberId: 'member-789' },
      }),
    );
  });

  it('returns error when memberId is missing', async () => {
    const result = await handle({ ...base, memberId: '' });
    expect(result).toMatchObject({ error: expect.any(String) });
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('returns error when points is zero', async () => {
    const result = await handle({ ...base, points: 0 });
    expect(result).toMatchObject({ error: expect.any(String) });
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('returns error when points is negative', async () => {
    const result = await handle({ ...base, points: -100 });
    expect(result).toMatchObject({ error: expect.any(String) });
    expect(mockSendPush).not.toHaveBeenCalled();
  });
});

// ── gamification_streak_milestone ─────────────────────────────────────────────

describe('gamification_streak_milestone', () => {
  const base = {
    type: 'gamification_streak_milestone' as const,
    memberId: 'member-abc',
    streakDays: 7,
  };

  it('sends push with correct title and body', async () => {
    const result = await handle(base);
    expect(result).toEqual({ sent: true, type: 'gamification_streak_milestone' });
    expect(mockSendPush).toHaveBeenCalledTimes(1);
    expect(mockSendPush).toHaveBeenCalledWith(
      'member-abc',
      expect.objectContaining({
        body: expect.stringContaining('7'),
        data: { type: 'gamification_streak_milestone', memberId: 'member-abc' },
      }),
    );
  });

  it('returns error when memberId is missing', async () => {
    const result = await handle({ ...base, memberId: '' });
    expect(result).toMatchObject({ error: expect.any(String) });
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('returns error when streakDays is zero', async () => {
    const result = await handle({ ...base, streakDays: 0 });
    expect(result).toMatchObject({ error: expect.any(String) });
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('returns error when streakDays is negative', async () => {
    const result = await handle({ ...base, streakDays: -1 });
    expect(result).toMatchObject({ error: expect.any(String) });
    expect(mockSendPush).not.toHaveBeenCalled();
  });
});

// ── unknown event type ────────────────────────────────────────────────────────

describe('unknown event type', () => {
  it('returns error for unknown type', async () => {
    const result = await handle({ type: 'gamification_unknown' } as unknown as GamificationEvent);
    expect(result).toMatchObject({ error: expect.any(String) });
    expect(mockSendPush).not.toHaveBeenCalled();
  });
});

// ── sendPushNotification resilience ──────────────────────────────────────────

describe('sendPushNotification resilience', () => {
  it('does not throw when sendPushNotification rejects', async () => {
    mockSendPush.mockRejectedValue(new Error('push service down'));
    await expect(
      handle({
        type: 'gamification_badge_awarded',
        memberId: 'member-123',
        badgeId: 'badge-xyz',
        badgeLabel: 'Top Buyer',
      }),
    ).resolves.not.toThrow();
  });

  it('returns error result when sendPushNotification rejects', async () => {
    mockSendPush.mockRejectedValue(new Error('push service down'));
    const result = await handle({
      type: 'gamification_badge_awarded',
      memberId: 'member-123',
      badgeId: 'badge-xyz',
      badgeLabel: 'Top Buyer',
    });
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});
