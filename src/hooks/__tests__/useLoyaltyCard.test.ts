/**
 * @module useLoyaltyCard.test
 *
 * Hook tests for useLoyaltyCard — cm-a31 / CF-yq80.
 * Covers API success, failure fallback, null memberId, null fields, and hasActivity.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useLoyaltyCard } from '../useLoyaltyCard';
import { getTierForPoints } from '@/data/loyaltyTiers';

const mockGetLoyaltyData = jest.fn();
const mockGetCurrentMember = jest.fn();

jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: () => ({ getLoyaltyData: mockGetLoyaltyData }),
}));

jest.mock('@/services/wix/wixAuth', () => ({
  WixAuthService: jest.fn().mockImplementation(() => ({
    getCurrentMember: mockGetCurrentMember,
  })),
}));

describe('useLoyaltyCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentMember.mockResolvedValue({ id: 'member-123' });
  });

  it('starts in loading state', () => {
    mockGetLoyaltyData.mockResolvedValue({
      points: 0,
      tier: 'Bronze',
      nextTierThreshold: 500,
      progressPercent: 0,
    });
    const { result } = renderHook(() => useLoyaltyCard());
    expect(result.current.isLoading).toBe(true);
  });

  it('returns loyalty data after fetch', async () => {
    mockGetLoyaltyData.mockResolvedValue({
      points: 250,
      tier: 'Bronze',
      nextTierThreshold: 500,
      progressPercent: 50,
    });
    const { result } = renderHook(() => useLoyaltyCard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.points).toBe(250);
    expect(result.current.tier).toBe(getTierForPoints(250)); // Trail Blazer
    expect(result.current.progressPercent).toBe(50);
  });

  it('derives tier from points (Trail Blazer at 0–499, Mountain Guide at 500+)', async () => {
    mockGetLoyaltyData.mockResolvedValue({
      points: 750,
      tier: 'Silver', // raw tier string is ignored — points drive tier derivation
      nextTierThreshold: 1500,
      progressPercent: 50,
    });
    const { result } = renderHook(() => useLoyaltyCard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tier).toBe(getTierForPoints(750)); // Mountain Guide
  });

  it('hasActivity=false when points=0 and totalEarned=0', async () => {
    mockGetLoyaltyData.mockResolvedValue({
      points: 0,
      tier: 'Bronze',
      nextTierThreshold: 500,
      progressPercent: 0,
      totalEarned: 0,
    });
    const { result } = renderHook(() => useLoyaltyCard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasActivity).toBe(false);
  });

  it('hasActivity=true when points=0 but totalEarned>0', async () => {
    mockGetLoyaltyData.mockResolvedValue({
      points: 0,
      tier: 'Bronze',
      nextTierThreshold: 500,
      progressPercent: 0,
      totalEarned: 100,
    });
    const { result } = renderHook(() => useLoyaltyCard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasActivity).toBe(true);
  });

  it('hasActivity=true when points>0', async () => {
    mockGetLoyaltyData.mockResolvedValue({
      points: 250,
      tier: 'Bronze',
      nextTierThreshold: 500,
      progressPercent: 50,
    });
    const { result } = renderHook(() => useLoyaltyCard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasActivity).toBe(true);
  });

  it('sets error and safe defaults on API failure', async () => {
    mockGetLoyaltyData.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useLoyaltyCard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.points).toBe(0);
    expect(result.current.tier).toBe(getTierForPoints(0)); // Trail Blazer (safe default)
    expect(result.current.hasActivity).toBe(false);
  });

  it('returns safe defaults when memberId is null', async () => {
    mockGetCurrentMember.mockResolvedValue(null);
    const { result } = renderHook(() => useLoyaltyCard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.points).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('handles null/missing points field gracefully', async () => {
    mockGetLoyaltyData.mockResolvedValue({
      tier: 'Bronze',
      nextTierThreshold: 500,
      progressPercent: 0,
    });
    const { result } = renderHook(() => useLoyaltyCard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.points).toBe(0);
  });

  it('clamps progressPercent to 0-100', async () => {
    mockGetLoyaltyData.mockResolvedValue({
      points: 200,
      tier: 'Bronze',
      nextTierThreshold: 500,
      progressPercent: 150,
    });
    const { result } = renderHook(() => useLoyaltyCard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.progressPercent).toBe(100);
  });

  it('refresh re-fetches data', async () => {
    mockGetLoyaltyData.mockResolvedValue({
      points: 250,
      tier: 'Bronze',
      nextTierThreshold: 500,
      progressPercent: 50,
    });
    const { result } = renderHook(() => useLoyaltyCard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetLoyaltyData).toHaveBeenCalledTimes(1);
    await act(async () => {
      await result.current.refresh();
    });
    expect(mockGetLoyaltyData).toHaveBeenCalledTimes(2);
  });
});
