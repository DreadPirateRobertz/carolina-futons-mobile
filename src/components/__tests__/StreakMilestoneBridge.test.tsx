/**
 * StreakMilestoneBridge tests — cfutons_mobile-tl9
 *
 * Verifies that StreakMilestoneBridge correctly wires streak + notification
 * preferences into useStreakMilestonePush.
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseStreakMilestonePush = jest.fn();
jest.mock('@/hooks/useStreakMilestonePush', () => ({
  useStreakMilestonePush: (opts: unknown) => mockUseStreakMilestonePush(opts),
}));

const mockUseStreak = jest.fn(() => ({ streak: 6, loading: false }));
jest.mock('@/hooks/useStreak', () => ({
  useStreak: () => mockUseStreak(),
}));

const mockUseNotifications = jest.fn(() => ({
  preferences: { streakMilestone: true },
  permissionStatus: 'granted',
}));
jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => mockUseNotifications(),
}));

import { StreakMilestoneBridge } from '../StreakMilestoneBridge';

beforeEach(() => {
  jest.clearAllMocks();
  mockUseStreak.mockReturnValue({ streak: 6, loading: false });
  mockUseNotifications.mockReturnValue({
    preferences: { streakMilestone: true },
    permissionStatus: 'granted',
  });
});

describe('StreakMilestoneBridge', () => {
  it('renders null', () => {
    const { toJSON } = render(<StreakMilestoneBridge />);
    expect(toJSON()).toBeNull();
  });

  it('passes streak, streakLoading, streakMilestoneEnabled, permissionGranted to useStreakMilestonePush', () => {
    render(<StreakMilestoneBridge />);
    expect(mockUseStreakMilestonePush).toHaveBeenCalledWith({
      streak: 6,
      streakLoading: false,
      streakMilestoneEnabled: true,
      permissionGranted: true,
    });
  });

  it('passes permissionGranted=false when permissionStatus is denied', () => {
    mockUseNotifications.mockReturnValue({
      preferences: { streakMilestone: true },
      permissionStatus: 'denied',
    });

    render(<StreakMilestoneBridge />);
    expect(mockUseStreakMilestonePush).toHaveBeenCalledWith(
      expect.objectContaining({ permissionGranted: false }),
    );
  });

  it('passes streakLoading=true while streak is loading', () => {
    mockUseStreak.mockReturnValue({ streak: 1, loading: true });

    render(<StreakMilestoneBridge />);
    expect(mockUseStreakMilestonePush).toHaveBeenCalledWith(
      expect.objectContaining({ streakLoading: true }),
    );
  });
});
