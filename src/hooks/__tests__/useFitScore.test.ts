import { renderHook, act } from '@testing-library/react-native';

const mockCallFunction = jest.fn();
jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => ({ callFunction: mockCallFunction }),
}));
jest.mock('@/services/personalizationCache', () => ({
  getCachedFitScore: jest.fn().mockResolvedValue(null),
  setCachedFitScore: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/services/crashReporting', () => ({ captureException: jest.fn() }));

import { useFitScore } from '../useFitScore';
import { getCachedFitScore, setCachedFitScore } from '@/services/personalizationCache';

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_FIT_SCORE_ENABLED = 'true';
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_FIT_SCORE_ENABLED;
});

it('returns null when memberId is null (guest user)', async () => {
  const { result } = renderHook(() => useFitScore('prod-1', null));
  await act(async () => {});
  expect(result.current.score).toBeNull();
  expect(mockCallFunction).not.toHaveBeenCalled();
});

it('returns null when feature flag is disabled', async () => {
  process.env.EXPO_PUBLIC_FIT_SCORE_ENABLED = 'false';
  const { result } = renderHook(() => useFitScore('prod-1', 'member-1'));
  await act(async () => {});
  expect(result.current.score).toBeNull();
  expect(mockCallFunction).not.toHaveBeenCalled();
});

it('returns cached score without calling Wix', async () => {
  (getCachedFitScore as jest.Mock).mockResolvedValueOnce({ score: 88, reasons: ['firm'] });
  const { result } = renderHook(() => useFitScore('prod-1', 'member-1'));
  await act(async () => {});
  expect(result.current.score).toBe(88);
  expect(mockCallFunction).not.toHaveBeenCalled();
});

it('fetches from Wix on cache miss and stores result', async () => {
  mockCallFunction.mockResolvedValue({ score: 92, reasons: ['firm', 'queen'] });
  const { result } = renderHook(() => useFitScore('prod-1', 'member-1'));
  await act(async () => {});
  expect(result.current.score).toBe(92);
  expect(setCachedFitScore).toHaveBeenCalledWith('prod-1', 'member-1', {
    score: 92,
    reasons: ['firm', 'queen'],
  });
});

it('returns null score on API error without throwing', async () => {
  mockCallFunction.mockRejectedValue(new Error('network'));
  const { result } = renderHook(() => useFitScore('prod-1', 'member-1'));
  await act(async () => {});
  expect(result.current.score).toBeNull();
  expect(result.current.error).toBeTruthy();
});

it('isLoading starts false for guest (no fetch triggered)', async () => {
  const { result } = renderHook(() => useFitScore('prod-1', null));
  expect(result.current.isLoading).toBe(false);
});
