/**
 * @module useLoyaltyCard.tierup.test
 *
 * TDD tests for tier-up event + Sentry error reporting — hq-0ne9f.
 * Written BEFORE implementation per cm mandate.
 *
 * Covers:
 *   - tierUp callback fires on bronze→silver upgrade
 *   - tierUp callback fires on silver→gold upgrade
 *   - tierUp does NOT fire on initial load (no previous tier to compare)
 *   - tierUp does NOT fire when tier stays the same across refreshes
 *   - tierUp does NOT fire on tier decrease (should never happen, but guard it)
 *   - captureException called on fetch failure
 *   - captureException called with structured context (action, memberId)
 *   - captureException NOT called on success
 *   - captureException NOT called when no memberId (unauthenticated — not an error)
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

const mockGetLoyaltyData = jest.fn();
const mockGetCurrentMember = jest.fn();
const mockCaptureException = jest.fn();
const mockOnTierUp = jest.fn();

jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: () => ({ getLoyaltyData: mockGetLoyaltyData }),
}));

jest.mock('@/services/wix/wixAuth', () => ({
  WixAuthService: jest.fn().mockImplementation(() => ({
    getCurrentMember: mockGetCurrentMember,
  })),
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

import { useLoyaltyCard } from '../useLoyaltyCard';

// ── Helpers ─────────────────────────────────────────────────────────

function makeLoyaltyResponse(tier: 'Bronze' | 'Silver' | 'Gold', points: number) {
  const thresholds = { Bronze: 500, Silver: 1500, Gold: 1500 };
  const progresses = { Bronze: (points / 500) * 100, Silver: ((points - 500) / 1000) * 100, Gold: 100 };
  return {
    points,
    tier,
    nextTierThreshold: thresholds[tier],
    progressPercent: Math.min(100, progresses[tier]),
    totalEarned: points,
  };
}

// ── Tier-Up Event ────────────────────────────────────────────────────

describe('useLoyaltyCard — tier-up event', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentMember.mockResolvedValue({ id: 'member-abc' });
  });

  it('does NOT fire onTierUp on initial load', async () => {
    mockGetLoyaltyData.mockResolvedValue(makeLoyaltyResponse('Bronze', 100));

    const { result } = renderHook(() => useLoyaltyCard({ onTierUp: mockOnTierUp }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockOnTierUp).not.toHaveBeenCalled();
  });

  it('fires onTierUp when tier upgrades bronze→silver on refresh', async () => {
    mockGetLoyaltyData
      .mockResolvedValueOnce(makeLoyaltyResponse('Bronze', 400))
      .mockResolvedValueOnce(makeLoyaltyResponse('Silver', 600));

    const { result } = renderHook(() => useLoyaltyCard({ onTierUp: mockOnTierUp }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockOnTierUp).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockOnTierUp).toHaveBeenCalledTimes(1);
    expect(mockOnTierUp).toHaveBeenCalledWith({ from: 'bronze', to: 'silver' });
  });

  it('fires onTierUp when tier upgrades silver→gold on refresh', async () => {
    mockGetLoyaltyData
      .mockResolvedValueOnce(makeLoyaltyResponse('Silver', 1200))
      .mockResolvedValueOnce(makeLoyaltyResponse('Gold', 1600));

    const { result } = renderHook(() => useLoyaltyCard({ onTierUp: mockOnTierUp }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockOnTierUp).toHaveBeenCalledTimes(1);
    expect(mockOnTierUp).toHaveBeenCalledWith({ from: 'silver', to: 'gold' });
  });

  it('does NOT fire onTierUp when tier stays the same across refreshes', async () => {
    mockGetLoyaltyData
      .mockResolvedValueOnce(makeLoyaltyResponse('Silver', 800))
      .mockResolvedValueOnce(makeLoyaltyResponse('Silver', 900));

    const { result } = renderHook(() => useLoyaltyCard({ onTierUp: mockOnTierUp }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockOnTierUp).not.toHaveBeenCalled();
  });

  it('does NOT fire onTierUp on a tier decrease (defensive guard)', async () => {
    mockGetLoyaltyData
      .mockResolvedValueOnce(makeLoyaltyResponse('Gold', 1600))
      .mockResolvedValueOnce(makeLoyaltyResponse('Silver', 800));

    const { result } = renderHook(() => useLoyaltyCard({ onTierUp: mockOnTierUp }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockOnTierUp).not.toHaveBeenCalled();
  });

  it('works correctly when no onTierUp callback is provided', async () => {
    mockGetLoyaltyData
      .mockResolvedValueOnce(makeLoyaltyResponse('Bronze', 400))
      .mockResolvedValueOnce(makeLoyaltyResponse('Silver', 600));

    const { result } = renderHook(() => useLoyaltyCard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => {
        await result.current.refresh();
      }),
    ).resolves.not.toThrow();
  });
});

// ── Sentry Error Reporting ──────────────────────────────────────────

describe('useLoyaltyCard — Sentry on failure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentMember.mockResolvedValue({ id: 'member-abc' });
  });

  it('calls captureException on fetch failure', async () => {
    mockGetLoyaltyData.mockRejectedValue(new Error('API timeout'));

    const { result } = renderHook(() => useLoyaltyCard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      'error',
      expect.objectContaining({ action: 'useLoyaltyCard-fetch' }),
    );
  });

  it('passes memberId in Sentry context', async () => {
    mockGetLoyaltyData.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useLoyaltyCard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      'error',
      expect.objectContaining({ memberId: 'member-abc' }),
    );
  });

  it('wraps non-Error rejections in an Error before capturing', async () => {
    mockGetLoyaltyData.mockRejectedValue('plain string error');

    const { result } = renderHook(() => useLoyaltyCard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      'error',
      expect.anything(),
    );
  });

  it('does NOT call captureException on success', async () => {
    mockGetLoyaltyData.mockResolvedValue(makeLoyaltyResponse('Bronze', 200));

    const { result } = renderHook(() => useLoyaltyCard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('does NOT call captureException when unauthenticated (no memberId)', async () => {
    mockGetCurrentMember.mockResolvedValue(null);

    const { result } = renderHook(() => useLoyaltyCard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('calls captureException on refresh failure after initial success', async () => {
    mockGetLoyaltyData
      .mockResolvedValueOnce(makeLoyaltyResponse('Bronze', 200))
      .mockRejectedValueOnce(new Error('refresh failed'));

    const { result } = renderHook(() => useLoyaltyCard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockCaptureException).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
  });
});
