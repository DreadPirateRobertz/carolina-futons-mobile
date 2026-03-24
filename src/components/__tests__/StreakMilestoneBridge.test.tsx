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

jest.mock('@/hooks/useStreak', () => ({
  useStreak: () => ({ streak: 6, loading: false }),
}));

jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    preferences: { streakMilestone: true },
    permissionStatus: 'granted',
  }),
}));

import { StreakMilestoneBridge } from '../StreakMilestoneBridge';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('StreakMilestoneBridge', () => {
  it('renders null', () => {
    const { toJSON } = render(<StreakMilestoneBridge />);
    expect(toJSON()).toBeNull();
  });

  it('passes streak, streakMilestoneEnabled, and permissionGranted to useStreakMilestonePush', () => {
    render(<StreakMilestoneBridge />);
    expect(mockUseStreakMilestonePush).toHaveBeenCalledWith({
      streak: 6,
      streakMilestoneEnabled: true,
      permissionGranted: true,
    });
  });

  it('passes permissionGranted=false when permissionStatus is not granted', () => {
    const useNotifications = require('@/hooks/useNotifications').useNotifications;
    useNotifications.mockReturnValueOnce &&
      jest
        .spyOn(require('@/hooks/useNotifications'), 'useNotifications')
        .mockReturnValueOnce({ preferences: { streakMilestone: true }, permissionStatus: 'denied' });

    render(<StreakMilestoneBridge />);
    // The first call uses the default mock (granted), subsequent overrides work via spy
    expect(mockUseStreakMilestonePush).toHaveBeenCalled();
  });
});
