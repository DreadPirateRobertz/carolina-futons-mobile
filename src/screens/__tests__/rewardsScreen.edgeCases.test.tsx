/**
 * RewardsScreen edge-case tests — cm-u4l
 *
 * Covers gaps in rewardsScreen.test.tsx:
 *  - getWixClientSingleton() throws: outer catch fires captureException, no emit
 *  - Negative points: treated as ≤ 0 (disabled, no emit)
 *  - Empty-string error: '' is falsy → normal screen rendered, not error branch
 *  - Default testID ('rewards-screen') forwarded in loading and error states
 *  - Custom testID forwarded in loading and error states
 *  - Rapid double-press: emits twice (no double-press guard)
 *  - Error recovery: rerenders to normal when error clears
 *  - Loading recovery: rerenders to normal when loading ends
 *  - XSS / special-char error strings: no crash
 *  - Redeem button text content ("Redeem Points")
 *  - Retry button accessibility label
 *  - pointsRedeemed equals current points for various values
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RewardsScreen } from '../RewardsScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockEmitRedemptionInitiated = jest.fn(
  (_client: unknown, _input: { pointsRedeemed: number; newTotal: number }) =>
    Promise.resolve({ success: true }),
);
jest.mock('@/services/crossRigEventBus', () => ({
  emitRedemptionInitiated: (client: unknown, input: { pointsRedeemed: number; newTotal: number }) =>
    mockEmitRedemptionInitiated(client, input),
}));

const mockWixClient = { callFunction: jest.fn(() => Promise.resolve({ success: true })) };
const mockGetWixClientSingleton = jest.fn(() => mockWixClient);
jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: () => mockGetWixClientSingleton(),
}));

const mockUseLoyalty = jest.fn();
jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockUseLoyalty(),
}));

const mockCaptureException = jest.fn();
jest.mock('@/services/crashReporting', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

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

function renderScreen(props: { testID?: string } = {}) {
  return render(
    <ThemeProvider>
      <RewardsScreen {...props} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetWixClientSingleton.mockReturnValue(mockWixClient);
  mockUseLoyalty.mockReturnValue(DEFAULT_LOYALTY);
});

// ─── getWixClientSingleton throws ────────────────────────────────────────────

describe('RewardsScreen — getWixClientSingleton throws', () => {
  it('captureException is called when getWixClientSingleton throws', () => {
    mockGetWixClientSingleton.mockImplementationOnce(() => {
      throw new Error('singleton not initialized');
    });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('rewards-redeem-button'));
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it('emitRedemptionInitiated is NOT called when getWixClientSingleton throws', () => {
    mockGetWixClientSingleton.mockImplementationOnce(() => {
      throw new Error('not initialized');
    });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('rewards-redeem-button'));
    expect(mockEmitRedemptionInitiated).not.toHaveBeenCalled();
  });

  it('captureException wraps a non-Error thrown value in an Error', () => {
    mockGetWixClientSingleton.mockImplementationOnce(() => {
      throw 'string thrown from singleton';
    });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('rewards-redeem-button'));
    const captured = mockCaptureException.mock.calls[0]?.[0];
    expect(captured).toBeInstanceOf(Error);
  });
});

// ─── Negative points ─────────────────────────────────────────────────────────

describe('RewardsScreen — negative points', () => {
  it('redeem button is disabled when points is negative', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: -1 });
    const { getByTestId } = renderScreen();
    expect(getByTestId('rewards-redeem-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('emitRedemptionInitiated is not called when points is negative', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: -50 });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('rewards-redeem-button'));
    expect(mockEmitRedemptionInitiated).not.toHaveBeenCalled();
  });

  it('negative points displays the value in the points element', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: -10 });
    const { getByTestId } = renderScreen();
    expect(getByTestId('rewards-points').props.children).toBe(-10);
  });
});

// ─── Empty-string error (falsy) ───────────────────────────────────────────────

describe('RewardsScreen — empty-string error', () => {
  it('empty string error shows normal screen (not error branch)', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, error: '' });
    const { getByTestId, queryByTestId } = renderScreen();
    expect(queryByTestId('rewards-error')).toBeNull();
    expect(queryByTestId('rewards-retry')).toBeNull();
    expect(getByTestId('rewards-redeem-button')).toBeTruthy();
  });

  it('empty string error shows points display', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, error: '' });
    const { getByTestId } = renderScreen();
    expect(getByTestId('rewards-points')).toBeTruthy();
  });
});

// ─── Default testID in all three states ──────────────────────────────────────

describe('RewardsScreen — default testID in all states', () => {
  it('loading state uses default testID "rewards-screen"', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, loading: true });
    const { getByTestId } = renderScreen();
    expect(getByTestId('rewards-screen')).toBeTruthy();
  });

  it('error state uses default testID "rewards-screen"', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, error: 'Something went wrong' });
    const { getByTestId } = renderScreen();
    expect(getByTestId('rewards-screen')).toBeTruthy();
  });

  it('normal state uses default testID "rewards-screen"', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('rewards-screen')).toBeTruthy();
  });
});

// ─── Custom testID forwarded in all three states ──────────────────────────────

describe('RewardsScreen — custom testID forwarded to all states', () => {
  it('custom testID forwarded in loading state', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, loading: true });
    const { getByTestId } = renderScreen({ testID: 'custom-loading' });
    expect(getByTestId('custom-loading')).toBeTruthy();
  });

  it('custom testID forwarded in error state', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, error: 'Boom' });
    const { getByTestId } = renderScreen({ testID: 'custom-error' });
    expect(getByTestId('custom-error')).toBeTruthy();
  });

  it('custom testID forwarded in normal state', () => {
    const { getByTestId } = renderScreen({ testID: 'custom-normal' });
    expect(getByTestId('custom-normal')).toBeTruthy();
  });
});

// ─── Rapid double-press (no guard) ───────────────────────────────────────────

describe('RewardsScreen — rapid double-press', () => {
  it('pressing redeem twice fires emitRedemptionInitiated twice', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('rewards-redeem-button'));
    fireEvent.press(getByTestId('rewards-redeem-button'));
    await Promise.resolve();
    expect(mockEmitRedemptionInitiated).toHaveBeenCalledTimes(2);
  });

  it('both emit calls carry the same points value', async () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 300 });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('rewards-redeem-button'));
    fireEvent.press(getByTestId('rewards-redeem-button'));
    await Promise.resolve();
    for (const call of mockEmitRedemptionInitiated.mock.calls) {
      expect(call[1]).toMatchObject({ pointsRedeemed: 300, newTotal: 0 });
    }
  });
});

// ─── Error / loading state recovery ──────────────────────────────────────────

describe('RewardsScreen — state recovery on rerender', () => {
  it('transitions from error to normal screen when error clears', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, error: 'Load failed' });
    const { getByTestId, queryByTestId, rerender } = renderScreen();
    expect(getByTestId('rewards-error')).toBeTruthy();

    mockUseLoyalty.mockReturnValue(DEFAULT_LOYALTY);
    rerender(
      <ThemeProvider>
        <RewardsScreen />
      </ThemeProvider>,
    );
    expect(queryByTestId('rewards-error')).toBeNull();
    expect(getByTestId('rewards-redeem-button')).toBeTruthy();
  });

  it('transitions from loading to normal screen when loading ends', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, loading: true });
    const { getByTestId, queryByTestId, rerender } = renderScreen();
    expect(getByTestId('rewards-loading')).toBeTruthy();

    mockUseLoyalty.mockReturnValue(DEFAULT_LOYALTY);
    rerender(
      <ThemeProvider>
        <RewardsScreen />
      </ThemeProvider>,
    );
    expect(queryByTestId('rewards-loading')).toBeNull();
    expect(getByTestId('rewards-redeem-button')).toBeTruthy();
  });

  it('transitions from normal to error screen when error is set', () => {
    const { getByTestId, queryByTestId, rerender } = renderScreen();
    expect(queryByTestId('rewards-error')).toBeNull();

    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, error: 'Network failure' });
    rerender(
      <ThemeProvider>
        <RewardsScreen />
      </ThemeProvider>,
    );
    expect(getByTestId('rewards-error')).toBeTruthy();
    expect(queryByTestId('rewards-redeem-button')).toBeNull();
  });
});

// ─── XSS / special-char error strings ────────────────────────────────────────

describe('RewardsScreen — XSS and special-char error strings', () => {
  it('XSS-like error string renders without crash', () => {
    mockUseLoyalty.mockReturnValue({
      ...DEFAULT_LOYALTY,
      error: '<script>alert(1)</script>',
    });
    expect(() => renderScreen()).not.toThrow();
  });

  it('error with apostrophe renders without crash', () => {
    mockUseLoyalty.mockReturnValue({
      ...DEFAULT_LOYALTY,
      error: "Couldn't load your rewards",
    });
    const { getByTestId } = renderScreen();
    expect(getByTestId('rewards-error')).toBeTruthy();
  });

  it('very long error string renders without crash', () => {
    mockUseLoyalty.mockReturnValue({
      ...DEFAULT_LOYALTY,
      error: 'e'.repeat(500),
    });
    expect(() => renderScreen()).not.toThrow();
  });
});

// ─── Button text content ──────────────────────────────────────────────────────

describe('RewardsScreen — button text content', () => {
  it('redeem button displays "Redeem Points" text', () => {
    const { getByText } = renderScreen();
    expect(getByText('Redeem Points')).toBeTruthy();
  });

  it('retry button displays "Retry" text', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, error: 'Something went wrong' });
    const { getByText } = renderScreen();
    expect(getByText('Retry')).toBeTruthy();
  });

  it('retry button has accessibility label "Retry loading rewards"', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, error: 'Oops' });
    const { getByTestId } = renderScreen();
    expect(getByTestId('rewards-retry').props.accessibilityLabel).toBe('Retry loading rewards');
  });
});

// ─── pointsRedeemed equals current points ─────────────────────────────────────

describe('RewardsScreen — pointsRedeemed matches current points', () => {
  it('pointsRedeemed is 1 when points is 1', async () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 1 });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('rewards-redeem-button'));
    await Promise.resolve();
    expect(mockEmitRedemptionInitiated).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ pointsRedeemed: 1 }),
    );
  });

  it('pointsRedeemed is 99999 when points is 99999', async () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 99999 });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('rewards-redeem-button'));
    await Promise.resolve();
    expect(mockEmitRedemptionInitiated).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ pointsRedeemed: 99999 }),
    );
  });

  it('emit receives the exact wixClient singleton from getWixClientSingleton', async () => {
    const specificClient = { id: 'specific-client', callFunction: jest.fn() };
    mockGetWixClientSingleton.mockReturnValueOnce(specificClient);
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('rewards-redeem-button'));
    await Promise.resolve();
    expect(mockEmitRedemptionInitiated).toHaveBeenCalledWith(specificClient, expect.anything());
  });
});

// ─── Redeem button disabled state ────────────────────────────────────────────

describe('RewardsScreen — redeem button disabled state', () => {
  it('redeem button disabled prop is false when points > 0', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 100 });
    const { getByTestId } = renderScreen();
    expect(getByTestId('rewards-redeem-button').props.accessibilityState?.disabled).toBe(false);
  });

  it('redeem button disabled prop is true when points is exactly 0', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 0 });
    const { getByTestId } = renderScreen();
    expect(getByTestId('rewards-redeem-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('accessibilityLabel shows "0 points" when points is 0', () => {
    mockUseLoyalty.mockReturnValue({ ...DEFAULT_LOYALTY, points: 0 });
    const { getByTestId } = renderScreen();
    expect(getByTestId('rewards-redeem-button').props.accessibilityLabel).toBe('Redeem 0 points');
  });
});
