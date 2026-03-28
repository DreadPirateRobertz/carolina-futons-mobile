/**
 * @module usePersonalization tests
 *
 * Epic B Task 4 — parallel fetch with Promise.allSettled, partial failure safe.
 */
import { renderHook, act } from '@testing-library/react-native';

const mockCallFunction = jest.fn();
jest.mock('@/services/wix/wixProvider', () => ({
  useWixClient: () => ({ callFunction: mockCallFunction }),
}));
jest.mock('@/services/personalizationCache', () => ({
  getCachedSommelierResult: jest.fn().mockResolvedValue(null),
  setCachedSommelierResult: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/services/crashReporting', () => ({ captureException: jest.fn() }));

import { usePersonalization } from '../usePersonalization';
import { captureException } from '@/services/crashReporting';

beforeEach(() => jest.clearAllMocks());

it('returns empty state when memberId is null', async () => {
  const { result } = renderHook(() => usePersonalization(null));
  await act(async () => {});
  expect(result.current.sommelierResult).toBeNull();
  expect(result.current.recommendations).toEqual([]);
  expect(result.current.isLoading).toBe(false);
  expect(mockCallFunction).not.toHaveBeenCalled();
});

it('sets isLoading true while fetching', async () => {
  let resolveA: (v: unknown) => void;
  mockCallFunction.mockReturnValueOnce(new Promise((r) => { resolveA = r; }));
  mockCallFunction.mockReturnValueOnce(new Promise(() => {}));

  const { result } = renderHook(() => usePersonalization('member-1'));
  expect(result.current.isLoading).toBe(true);

  await act(async () => {
    resolveA!({ memberId: 'member-1', topStyle: 'Modern', flavors: [], recommendations: [] });
  });
});

it('returns sommelierResult on success', async () => {
  mockCallFunction
    .mockResolvedValueOnce({ memberId: 'member-1', topStyle: 'Modern', flavors: ['firm'], recommendations: [] })
    .mockResolvedValueOnce([]);
  const { result } = renderHook(() => usePersonalization('member-1'));
  await act(async () => {});
  expect(result.current.sommelierResult?.topStyle).toBe('Modern');
  expect(result.current.topStyle).toBe('Modern');
  expect(result.current.isLoading).toBe(false);
});

it('partial failure — sommelier fails but recommendations succeed', async () => {
  mockCallFunction
    .mockRejectedValueOnce(new Error('sommelier error'))
    .mockResolvedValueOnce([{ id: 'prod-1' }]);
  const { result } = renderHook(() => usePersonalization('member-1'));
  await act(async () => {});
  expect(result.current.sommelierResult).toBeNull();
  expect(result.current.recommendations).toEqual([{ id: 'prod-1' }]);
  expect(captureException).toHaveBeenCalled();
});

it('partial failure — recommendations fail but sommelier succeeds', async () => {
  mockCallFunction
    .mockResolvedValueOnce({ memberId: 'member-1', topStyle: 'Cozy', flavors: [], recommendations: [] })
    .mockRejectedValueOnce(new Error('recs error'));
  const { result } = renderHook(() => usePersonalization('member-1'));
  await act(async () => {});
  expect(result.current.sommelierResult?.topStyle).toBe('Cozy');
  expect(result.current.recommendations).toEqual([]);
  expect(captureException).toHaveBeenCalled();
});
