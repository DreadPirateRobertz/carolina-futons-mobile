/**
 * TDD tests for useDormancyRescuePush — dormancy rescue push notification hook.
 *
 * Covers:
 *  - Scheduling: fires 14-day trigger, body mentions balance, deep-link data,
 *    cancels previous before scheduling, persists scheduledAt to AsyncStorage
 *  - Permission guard: no schedule/cancel when permissionGranted is false
 *  - Session throttle: skips reschedule if last schedule < 1 hour ago
 *  - Unmount: does NOT cancel (notification must fire when app is closed)
 *  - Error resilience: storage fail, schedule fail, cancel fail — no crash
 *  - Points balance edge cases: 0 pts, 12500 pts
 *
 * Bead: cfutons_mobile-b0z
 */
import { renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useDormancyRescuePush } from '../useDormancyRescuePush';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('dormancy-notif-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

const mockSchedule = jest.mocked(Notifications.scheduleNotificationAsync);
const mockCancel = jest.mocked(Notifications.cancelScheduledNotificationAsync);
const mockGetItem = jest.mocked(AsyncStorage.getItem);
const mockSetItem = jest.mocked(AsyncStorage.setItem);

const STORAGE_KEY = '@cf_dormancy_state';
const FOURTEEN_DAYS_SECONDS = 14 * 24 * 60 * 60;
const ONE_HOUR_MS = 60 * 60 * 1000;
const FIXED_NOW = 1_700_000_000_000; // arbitrary fixed timestamp

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeState(overrides: { notifId?: string; scheduledAt?: number } = {}) {
  return JSON.stringify({
    notifId: overrides.notifId ?? 'old-notif-id',
    scheduledAt: overrides.scheduledAt ?? FIXED_NOW - 2 * ONE_HOUR_MS,
  });
}

function renderDormancy(
  opts: { pointsBalance?: number; permissionGranted?: boolean } = {},
) {
  return renderHook(() =>
    useDormancyRescuePush({
      pointsBalance: opts.pointsBalance ?? 250,
      permissionGranted: opts.permissionGranted ?? true,
    }),
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockSchedule.mockResolvedValue('dormancy-notif-id');
  mockCancel.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── Scheduling ────────────────────────────────────────────────────────────────

describe('scheduling', () => {
  it('schedules a notification with a 14-day time interval trigger', async () => {
    const { unmount } = renderDormancy();
    await new Promise((r) => setTimeout(r, 0));

    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({
          type: 'timeInterval',
          seconds: FOURTEEN_DAYS_SECONDS,
          repeats: false,
        }),
      }),
    );

    unmount();
  });

  it('includes the points balance in the notification body', async () => {
    renderDormancy({ pointsBalance: 750 });
    await new Promise((r) => setTimeout(r, 0));

    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          body: expect.stringContaining('750'),
        }),
      }),
    );
  });

  it('includes deep-link data with gamification_type and deepLink', async () => {
    renderDormancy();
    await new Promise((r) => setTimeout(r, 0));

    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          data: expect.objectContaining({
            gamification_type: 'dormancy_rescue',
            deepLink: 'carolinafutons://loyalty',
          }),
        }),
      }),
    );
  });

  it('cancels any previous dormancy notification before scheduling a new one', async () => {
    mockGetItem.mockResolvedValue(makeState({ notifId: 'prev-id', scheduledAt: FIXED_NOW - 2 * ONE_HOUR_MS }));

    renderDormancy();
    await new Promise((r) => setTimeout(r, 0));

    expect(mockCancel).toHaveBeenCalledWith('prev-id');
    expect(mockSchedule).toHaveBeenCalled();
    // cancel must happen before schedule
    const cancelOrder = mockCancel.mock.invocationCallOrder[0];
    const scheduleOrder = mockSchedule.mock.invocationCallOrder[0];
    expect(cancelOrder).toBeLessThan(scheduleOrder);
  });

  it('persists the new notifId and scheduledAt to AsyncStorage after scheduling', async () => {
    renderDormancy();
    await new Promise((r) => setTimeout(r, 0));

    expect(mockSetItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.stringContaining('"notifId"'),
    );
    const savedArg = mockSetItem.mock.calls[0][1] as string;
    const saved = JSON.parse(savedArg);
    expect(saved.notifId).toBe('dormancy-notif-id');
    expect(saved.scheduledAt).toBe(FIXED_NOW);
  });
});

// ── Permission guard ───────────────────────────────────────────────────────────

describe('permission guard', () => {
  it('does not schedule when permissionGranted is false', async () => {
    renderDormancy({ permissionGranted: false });
    await new Promise((r) => setTimeout(r, 0));

    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('does not cancel any existing notification when permissionGranted is false', async () => {
    mockGetItem.mockResolvedValue(makeState());
    renderDormancy({ permissionGranted: false });
    await new Promise((r) => setTimeout(r, 0));

    expect(mockCancel).not.toHaveBeenCalled();
  });
});

// ── Session throttle ───────────────────────────────────────────────────────────

describe('session throttle', () => {
  it('skips rescheduling when last schedule was less than 1 hour ago', async () => {
    mockGetItem.mockResolvedValue(makeState({ scheduledAt: FIXED_NOW - 30 * 60 * 1000 }));

    renderDormancy();
    await new Promise((r) => setTimeout(r, 0));

    expect(mockSchedule).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('reschedules when last schedule was more than 1 hour ago', async () => {
    mockGetItem.mockResolvedValue(makeState({ scheduledAt: FIXED_NOW - 2 * ONE_HOUR_MS }));

    renderDormancy();
    await new Promise((r) => setTimeout(r, 0));

    expect(mockSchedule).toHaveBeenCalled();
  });
});

// ── Unmount ────────────────────────────────────────────────────────────────────

describe('unmount', () => {
  it('does NOT cancel the notification on unmount (must fire when app is closed)', async () => {
    const { unmount } = renderDormancy();
    await new Promise((r) => setTimeout(r, 0));

    mockCancel.mockClear();
    unmount();

    expect(mockCancel).not.toHaveBeenCalled();
  });
});

// ── Error resilience ───────────────────────────────────────────────────────────

describe('error resilience', () => {
  it('does not crash when AsyncStorage.getItem rejects', async () => {
    mockGetItem.mockRejectedValue(new Error('storage read fail'));

    expect(() => {
      renderDormancy();
    }).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));

    expect(
      jest.mocked(require('@/services/crashReporting').captureException),
    ).toHaveBeenCalledWith(expect.any(Error));
  });

  it('does not crash when scheduleNotificationAsync rejects', async () => {
    mockSchedule.mockRejectedValue(new Error('schedule fail'));

    expect(() => {
      renderDormancy();
    }).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));

    expect(
      jest.mocked(require('@/services/crashReporting').captureException),
    ).toHaveBeenCalledWith(expect.any(Error));
  });

  it('does not crash when cancelScheduledNotificationAsync rejects, still schedules', async () => {
    mockGetItem.mockResolvedValue(makeState({ notifId: 'old-id', scheduledAt: FIXED_NOW - 2 * ONE_HOUR_MS }));
    mockCancel.mockRejectedValue(new Error('cancel fail'));

    expect(() => {
      renderDormancy();
    }).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));

    expect(mockSchedule).toHaveBeenCalled();
  });
});

// ── Points balance edge cases ─────────────────────────────────────────────────

describe('points balance edge cases', () => {
  it('schedules normally with 0 points balance', async () => {
    renderDormancy({ pointsBalance: 0 });
    await new Promise((r) => setTimeout(r, 0));

    expect(mockSchedule).toHaveBeenCalled();
  });

  it('schedules normally with large points balance (12500)', async () => {
    renderDormancy({ pointsBalance: 12500 });
    await new Promise((r) => setTimeout(r, 0));

    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          body: expect.stringContaining('12500'),
        }),
      }),
    );
  });
});
