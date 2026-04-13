/**
 * RewardsScreen cross-rig event bus tests — cf-87tn / cm-0t5
 *
 * Verifies that emitRedemptionInitiated fires when the user presses
 * the Redeem button on the RewardsScreen. Additional edge cases added
 * in cm-0t5: error states, loading skeleton, API failure paths.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RewardsScreen } from '../RewardsScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockEmitRedemptionInitiated = jest.fn(
  (_client: unknown, _input: { pointsRedeemed: number; newTotal: number }) =>
    Promise.resolve({ success: true }),
);
jest.mock('@/services/crossRigEventBus', () => ({
  emitRedemptionInitiated: (client: unknown, input: { pointsRedeemed: number; newTotal: number }) =>
    mockEmitRedemptionInitiated(client, input),
}));

const mockWixClient = { callFunction: jest.fn(() => Promise.resolve({ success: true })) };
jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: () => mockWixClient,
}));

const mockUseLoyalty = jest.fn();
jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockUseLoyalty(),
}));

const mockCaptureException = jest.fn();
jest.mock('@/services/crashReporting', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const DEFAULT_LOYALTY = {
  points: 500,
  tier: 'silver' as const,
  nextTier: 'gold' as const,
  pointsToNext: 1000,
  progress: 25,
  loading: false,
  error: null,
  refreshPoints: jest.fn(),
};

function renderScreen(props = {}) {
  return render(
    <ThemeProvider>
      <RewardsScreen {...props} />
    </ThemeProvider>,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('RewardsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLoyalty.mockReturnValue(DEFAULT_LOYALTY);
  });

  it('renders the redeem button', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('rewards-redeem-button')).toBeTruthy();
  });

  it('shows current points balance', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('rewards-points').props.children).toBe(500);
  });

  it('shows loading indicator while fetching', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, loading: true });
    const { getByTestId } = renderScreen();
    expect(getByTestId('rewards-loading')).toBeTruthy();
  });

  it('calls emitRedemptionInitiated with correct args when redeem is pressed', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('rewards-redeem-button'));
    await Promise.resolve();
    expect(mockEmitRedemptionInitiated).toHaveBeenCalledTimes(1);
    expect(mockEmitRedemptionInitiated).toHaveBeenCalledWith(
      mockWixClient,
      expect.objectContaining({ pointsRedeemed: 500, newTotal: 0 }),
    );
  });

  it('does not call emitRedemptionInitiated when points is zero', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 0 });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('rewards-redeem-button'));
    expect(mockEmitRedemptionInitiated).not.toHaveBeenCalled();
  });

  it('shows error state with retry button when useLoyalty has error', () => {
    mockUseLoyalty.mockReturnValue({
      ...DEFAULT_LOYALTY,
      error: 'Network error',
    });
    const { getByTestId, queryByTestId } = renderScreen();
    expect(getByTestId('rewards-error')).toBeTruthy();
    expect(getByTestId('rewards-retry')).toBeTruthy();
    expect(queryByTestId('rewards-redeem-button')).toBeNull();
  });

  it('calls refreshPoints when retry is pressed', () => {
    const mockRefresh = jest.fn();
    mockUseLoyalty.mockReturnValue({
      ...DEFAULT_LOYALTY,
      error: 'Network error',
      refreshPoints: mockRefresh,
    });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('rewards-retry'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables redeem button styling when points is zero', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 0 });
    const { getByTestId } = renderScreen();
    const button = getByTestId('rewards-redeem-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('catches emitRedemptionInitiated rejection without crashing', async () => {
    mockEmitRedemptionInitiated.mockRejectedValueOnce(new Error('event bus down'));
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('rewards-redeem-button'));
    await new Promise((r) => setTimeout(r, 10));
    expect(mockCaptureException).toHaveBeenCalled();
  });

  describe('accessibility', () => {
    it('redeem button has accessibilityLabel', () => {
      mockUseLoyalty.mockReturnValue(DEFAULT_LOYALTY);
      const { getByTestId } = renderScreen();
      const btn = getByTestId('rewards-redeem-button');
      expect(btn.props.accessibilityLabel).toBeTruthy();
    });

    it('retry button has accessibilityLabel', () => {
      mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, error: 'Network error' });
      const { getByTestId } = renderScreen();
      const btn = getByTestId('rewards-retry');
      expect(btn.props.accessibilityLabel).toBeTruthy();
    });

    it('redeem button accessibilityLabel includes points count', () => {
      mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 500 });
      const { getByTestId } = renderScreen();
      const btn = getByTestId('rewards-redeem-button');
      expect(btn.props.accessibilityLabel).toMatch(/500/);
    });
  });

  // ── cm-0t5: additional edge cases ──────────────────────────────────────────

  describe('points display edge cases', () => {
    it('shows "points available" label text', () => {
      const { getByText } = renderScreen();
      expect(getByText(/points available/i)).toBeTruthy();
    });

    it('displays zero points correctly in the points testID', () => {
      mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 0 });
      const { getByTestId } = renderScreen();
      expect(getByTestId('rewards-points').props.children).toBe(0);
    });

    it('displays large points value correctly', () => {
      mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 99999 });
      const { getByTestId } = renderScreen();
      expect(getByTestId('rewards-points').props.children).toBe(99999);
    });

    it('enables redeem button at exactly 1 point (boundary)', () => {
      mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 1 });
      const { getByTestId } = renderScreen();
      const btn = getByTestId('rewards-redeem-button');
      expect(btn.props.accessibilityState?.disabled).toBeFalsy();
    });

    it('testID prop is forwarded to the container', () => {
      const { getByTestId } = renderScreen({ testID: 'custom-rewards-root' });
      expect(getByTestId('custom-rewards-root')).toBeTruthy();
    });
  });

  describe('loading state edge cases', () => {
    it('loading state hides the redeem button', () => {
      mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, loading: true });
      const { queryByTestId } = renderScreen();
      expect(queryByTestId('rewards-redeem-button')).toBeNull();
    });

    it('loading state hides points display', () => {
      mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, loading: true });
      const { queryByTestId } = renderScreen();
      expect(queryByTestId('rewards-points')).toBeNull();
    });

    it('non-loading state hides the activity indicator', () => {
      mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, loading: false });
      const { queryByTestId } = renderScreen();
      expect(queryByTestId('rewards-loading')).toBeNull();
    });
  });

  describe('error state edge cases', () => {
    it('error state hides the redeem button', () => {
      mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, error: 'Something went wrong' });
      const { queryByTestId } = renderScreen();
      expect(queryByTestId('rewards-redeem-button')).toBeNull();
    });

    it('error state hides the loading indicator', () => {
      mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, error: 'Something went wrong' });
      const { queryByTestId } = renderScreen();
      expect(queryByTestId('rewards-loading')).toBeNull();
    });

    it('displays the verbatim error message text', () => {
      const errorMsg = 'Failed to load your loyalty data';
      mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, error: errorMsg });
      const { getByTestId } = renderScreen();
      expect(getByTestId('rewards-error').props.children).toBe(errorMsg);
    });
  });

  describe('API failure paths', () => {
    it('captureException receives an Error instance when emit rejects', async () => {
      mockEmitRedemptionInitiated.mockRejectedValueOnce(new Error('bus failure'));
      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId('rewards-redeem-button'));
      await new Promise((r) => setTimeout(r, 10));
      const captured = mockCaptureException.mock.calls[0]?.[0];
      expect(captured).toBeInstanceOf(Error);
    });

    it('captureException receives an Error even when a non-Error is thrown', async () => {
      mockEmitRedemptionInitiated.mockRejectedValueOnce('string error');
      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId('rewards-redeem-button'));
      await new Promise((r) => setTimeout(r, 10));
      const captured = mockCaptureException.mock.calls[0]?.[0];
      expect(captured).toBeInstanceOf(Error);
    });

    it('emitRedemptionInitiated called exactly once per button press', async () => {
      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId('rewards-redeem-button'));
      await Promise.resolve();
      expect(mockEmitRedemptionInitiated).toHaveBeenCalledTimes(1);
    });

    it('newTotal passed to emitRedemptionInitiated is always 0', async () => {
      mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 750 });
      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId('rewards-redeem-button'));
      await Promise.resolve();
      expect(mockEmitRedemptionInitiated).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ newTotal: 0 }),
      );
    });
  });
});
