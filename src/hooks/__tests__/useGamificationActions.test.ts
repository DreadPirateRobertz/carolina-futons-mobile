/**
 * @module useGamificationActions tests — hq-1jcj
 *
 * TDD: tests written BEFORE implementation per CLAUDE.md mandate.
 *
 * Hook awards loyalty points for:
 *   - AR try-on:        5 pts  (action: 'ar_try_on')
 *   - Room photo upload: 25 pts (action: 'room_photo_upload')
 *   - Product review:   10 pts  (action: 'product_review')
 *
 * All awards are best-effort — failures are logged and swallowed (non-fatal).
 * Empty/missing IDs skip the award entirely.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useGamificationActions } from '../useGamificationActions';

// ---------------------------------------------------------------------------
// Mock useLoyalty — provides awardPoints for the hook to call
// ---------------------------------------------------------------------------

const mockAward = jest.fn();

jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => ({ awardPoints: mockAward }),
}));

beforeEach(() => {
  mockAward.mockClear();
});

// ---------------------------------------------------------------------------
// awardForARTryOn — 5 pts
// ---------------------------------------------------------------------------

describe('useGamificationActions — awardForARTryOn', () => {
  it('awards 5 points with correct action and productId', async () => {
    mockAward.mockResolvedValue({ newTotal: 105 });
    const { result } = renderHook(() => useGamificationActions());

    await act(async () => {
      await result.current.awardForARTryOn('product-123');
    });

    expect(mockAward).toHaveBeenCalledWith({
      action: 'ar_try_on',
      productId: 'product-123',
      points: 5,
    });
    expect(mockAward).toHaveBeenCalledTimes(1);
  });

  it('does not call awardPoints when productId is empty string', async () => {
    const { result } = renderHook(() => useGamificationActions());

    await act(async () => {
      await result.current.awardForARTryOn('');
    });

    expect(mockAward).not.toHaveBeenCalled();
  });

  it('does not call awardPoints when productId is whitespace only', async () => {
    const { result } = renderHook(() => useGamificationActions());

    await act(async () => {
      await result.current.awardForARTryOn('   ');
    });

    expect(mockAward).not.toHaveBeenCalled();
  });

  it('swallows award failure — resolves undefined, logs error', async () => {
    const boom = new Error('rate limited');
    mockAward.mockRejectedValue(boom);
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useGamificationActions());

    await expect(
      act(async () => {
        await result.current.awardForARTryOn('product-123');
      }),
    ).resolves.toBeUndefined();

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[useGamificationActions]'), boom);
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// awardForRoomPhoto — 25 pts
// ---------------------------------------------------------------------------

describe('useGamificationActions — awardForRoomPhoto', () => {
  it('awards 25 points with correct action and photoId', async () => {
    mockAward.mockResolvedValue({ newTotal: 125 });
    const { result } = renderHook(() => useGamificationActions());

    await act(async () => {
      await result.current.awardForRoomPhoto('photo-456');
    });

    expect(mockAward).toHaveBeenCalledWith({
      action: 'room_photo_upload',
      photoId: 'photo-456',
      points: 25,
    });
    expect(mockAward).toHaveBeenCalledTimes(1);
  });

  it('does not call awardPoints when photoId is empty string', async () => {
    const { result } = renderHook(() => useGamificationActions());

    await act(async () => {
      await result.current.awardForRoomPhoto('');
    });

    expect(mockAward).not.toHaveBeenCalled();
  });

  it('swallows award failure — resolves undefined, logs error', async () => {
    const boom = new Error('network timeout');
    mockAward.mockRejectedValue(boom);
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useGamificationActions());

    await expect(
      act(async () => {
        await result.current.awardForRoomPhoto('photo-456');
      }),
    ).resolves.toBeUndefined();

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[useGamificationActions]'), boom);
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// awardForProductReview — 10 pts
// ---------------------------------------------------------------------------

describe('useGamificationActions — awardForProductReview', () => {
  it('awards 10 points with correct action and productId', async () => {
    mockAward.mockResolvedValue({ newTotal: 110 });
    const { result } = renderHook(() => useGamificationActions());

    await act(async () => {
      await result.current.awardForProductReview('product-789');
    });

    expect(mockAward).toHaveBeenCalledWith({
      action: 'product_review',
      productId: 'product-789',
      points: 10,
    });
    expect(mockAward).toHaveBeenCalledTimes(1);
  });

  it('does not call awardPoints when productId is empty string', async () => {
    const { result } = renderHook(() => useGamificationActions());

    await act(async () => {
      await result.current.awardForProductReview('');
    });

    expect(mockAward).not.toHaveBeenCalled();
  });

  it('swallows award failure — resolves undefined, logs error', async () => {
    const boom = new Error('server error');
    mockAward.mockRejectedValue(boom);
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useGamificationActions());

    await expect(
      act(async () => {
        await result.current.awardForProductReview('product-789');
      }),
    ).resolves.toBeUndefined();

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[useGamificationActions]'), boom);
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Stability — award functions are stable across re-renders
// ---------------------------------------------------------------------------

describe('useGamificationActions — referential stability', () => {
  it('returns the same function references across re-renders', () => {
    const { result, rerender } = renderHook(() => useGamificationActions());

    const first = {
      arTryOn: result.current.awardForARTryOn,
      roomPhoto: result.current.awardForRoomPhoto,
      review: result.current.awardForProductReview,
    };

    rerender({});

    expect(result.current.awardForARTryOn).toBe(first.arTryOn);
    expect(result.current.awardForRoomPhoto).toBe(first.roomPhoto);
    expect(result.current.awardForProductReview).toBe(first.review);
  });
});
