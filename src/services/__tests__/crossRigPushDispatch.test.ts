/**
 * TDD tests for crossRigPushDispatch.
 *
 * CFM receives push dispatch events from cfutons (badge_earned, tier_changed)
 * and routes them to expo-notifications local push scheduling.
 *
 * Contract source: melania cf-axn (PR#1025) + cf-bdl push dispatch trigger.
 * sendPushToMember stub: jest.fn().mockResolvedValue({ sent: N, failed: 0 })
 *
 * @bead cm-3hg
 */

import { dispatchCrossRigPush, PUSH_EVENTS, CrossRigPushResult } from '../crossRigPushDispatch';

// ── Mock expo-notifications ───────────────────────────────────────────────────

const mockScheduleNotificationAsync = jest.fn();
const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...args: unknown[]) => mockScheduleNotificationAsync(...args),
  getPermissionsAsync: () => mockGetPermissionsAsync(),
  requestPermissionsAsync: () => mockRequestPermissionsAsync(),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function grantedPermissions() {
  mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
  mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
}

function deniedPermissions() {
  mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });
  mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  grantedPermissions();
  mockScheduleNotificationAsync.mockResolvedValue('notif-id-1');
});

// ── PUSH_EVENTS constants ─────────────────────────────────────────────────────

describe('PUSH_EVENTS', () => {
  it('exports BADGE_EARNED constant', () => {
    expect(PUSH_EVENTS.BADGE_EARNED).toBe('badge_earned');
  });

  it('exports TIER_CHANGED constant', () => {
    expect(PUSH_EVENTS.TIER_CHANGED).toBe('tier_changed');
  });
});

// ── badge_earned dispatch ─────────────────────────────────────────────────────

describe('badge_earned dispatch', () => {
  it('calls scheduleNotificationAsync when badge earned', async () => {
    const result = await dispatchCrossRigPush('member-001', PUSH_EVENTS.BADGE_EARNED, {
      badgeId: 'badge-gold-sofa',
    });
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('notification content includes badge_earned title', async () => {
    await dispatchCrossRigPush('member-001', PUSH_EVENTS.BADGE_EARNED, { badgeId: 'badge-bronze' });
    const call = mockScheduleNotificationAsync.mock.calls[0][0];
    expect(call.content.title).toMatch(/badge/i);
  });

  it('notification content includes badgeId in body or data', async () => {
    await dispatchCrossRigPush('member-001', PUSH_EVENTS.BADGE_EARNED, { badgeId: 'badge-gold' });
    const call = mockScheduleNotificationAsync.mock.calls[0][0];
    const hasInBody = call.content.body?.includes('badge-gold');
    const hasInData = call.content.data?.badgeId === 'badge-gold';
    expect(hasInBody || hasInData).toBe(true);
  });

  it('trigger is immediate (seconds: 1)', async () => {
    await dispatchCrossRigPush('member-001', PUSH_EVENTS.BADGE_EARNED, { badgeId: 'b1' });
    const call = mockScheduleNotificationAsync.mock.calls[0][0];
    expect(call.trigger.seconds).toBe(1);
  });
});

// ── tier_changed dispatch ─────────────────────────────────────────────────────

describe('tier_changed dispatch', () => {
  it('calls scheduleNotificationAsync when tier changes', async () => {
    const result = await dispatchCrossRigPush('member-002', PUSH_EVENTS.TIER_CHANGED, {
      oldTier: 'Silver',
      newTier: 'Gold',
    });
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('notification content includes tier_changed title', async () => {
    await dispatchCrossRigPush('member-002', PUSH_EVENTS.TIER_CHANGED, {
      oldTier: 'Silver',
      newTier: 'Gold',
    });
    const call = mockScheduleNotificationAsync.mock.calls[0][0];
    expect(call.content.title).toMatch(/tier|level|status/i);
  });

  it('notification body includes new tier name', async () => {
    await dispatchCrossRigPush('member-002', PUSH_EVENTS.TIER_CHANGED, {
      oldTier: 'Silver',
      newTier: 'Gold',
    });
    const call = mockScheduleNotificationAsync.mock.calls[0][0];
    expect(call.content.body).toMatch(/Gold/i);
  });

  it('trigger is immediate (seconds: 1)', async () => {
    await dispatchCrossRigPush('member-002', PUSH_EVENTS.TIER_CHANGED, {
      oldTier: 'Bronze',
      newTier: 'Silver',
    });
    const call = mockScheduleNotificationAsync.mock.calls[0][0];
    expect(call.trigger.seconds).toBe(1);
  });
});

// ── Permission denied ─────────────────────────────────────────────────────────

describe('push permission denied', () => {
  beforeEach(() => {
    deniedPermissions();
  });

  it('does NOT throw when push permission is denied', async () => {
    await expect(
      dispatchCrossRigPush('member-001', PUSH_EVENTS.BADGE_EARNED, { badgeId: 'b1' }),
    ).resolves.not.toThrow();
  });

  it('returns failed:1, sent:0 when push permission is denied', async () => {
    const result = await dispatchCrossRigPush('member-001', PUSH_EVENTS.BADGE_EARNED, {
      badgeId: 'b1',
    });
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
  });

  it('does NOT call scheduleNotificationAsync when permission denied', async () => {
    await dispatchCrossRigPush('member-001', PUSH_EVENTS.BADGE_EARNED, { badgeId: 'b1' });
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

// ── scheduleNotificationAsync throws ─────────────────────────────────────────

describe('notification scheduling errors', () => {
  it('returns failed:1 when scheduleNotificationAsync throws', async () => {
    mockScheduleNotificationAsync.mockRejectedValue(new Error('Push quota exceeded'));
    const result = await dispatchCrossRigPush('member-001', PUSH_EVENTS.BADGE_EARNED, {
      badgeId: 'b1',
    });
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
  });

  it('does NOT propagate notification scheduling errors to caller', async () => {
    mockScheduleNotificationAsync.mockRejectedValue(new Error('Device quota exceeded'));
    await expect(
      dispatchCrossRigPush('member-001', PUSH_EVENTS.BADGE_EARNED, { badgeId: 'b1' }),
    ).resolves.not.toThrow();
  });
});

// ── Unknown event type ────────────────────────────────────────────────────────

describe('unknown event type', () => {
  it('returns sent:0, failed:0 for unknown event — silently ignored', async () => {
    const result = await dispatchCrossRigPush('member-001', 'totally_unknown_event', {});
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

// ── Missing/empty payload ─────────────────────────────────────────────────────

describe('edge cases — payload', () => {
  it('badge_earned with missing badgeId does not throw', async () => {
    await expect(
      dispatchCrossRigPush('member-001', PUSH_EVENTS.BADGE_EARNED, {}),
    ).resolves.not.toThrow();
  });

  it('tier_changed with missing newTier does not throw', async () => {
    await expect(
      dispatchCrossRigPush('member-001', PUSH_EVENTS.TIER_CHANGED, { oldTier: 'Bronze' }),
    ).resolves.not.toThrow();
  });

  it('empty memberId does not throw', async () => {
    await expect(
      dispatchCrossRigPush('', PUSH_EVENTS.BADGE_EARNED, { badgeId: 'b1' }),
    ).resolves.not.toThrow();
  });
});

// ── sendPushToMember contract stub ────────────────────────────────────────────

describe('sendPushToMember contract stub', () => {
  it('result shape matches CF contract: { sent: number, failed: number }', async () => {
    const result: CrossRigPushResult = await dispatchCrossRigPush(
      'member-001',
      PUSH_EVENTS.BADGE_EARNED,
      { badgeId: 'b1' },
    );
    expect(typeof result.sent).toBe('number');
    expect(typeof result.failed).toBe('number');
  });
});
