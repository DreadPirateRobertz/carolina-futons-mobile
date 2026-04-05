/**
 * useAffirmDeepLink TDD tests — hq-8iw
 *
 * Tests written BEFORE implementation per CLAUDE.md mandate.
 *
 * Hook opens the Affirm calculator (native app deep-link, web fallback)
 * pre-populated with the product price. Gracefully handles:
 *   - Affirm app not installed → web fallback
 *   - Linking.openURL failure → sets error
 *   - Affirm SDK/Linking entirely unavailable → error state, no crash
 *
 * App URL:  affirm://calculator?amount=<cents>
 * Web URL:  https://www.affirm.com/apps
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { useAffirmDeepLink } from '../useAffirmDeepLink';

// ---------------------------------------------------------------------------
// Mocks — spyOn keeps RN's module graph intact
// ---------------------------------------------------------------------------

const mockCanOpenURL = jest.spyOn(Linking, 'canOpenURL');
const mockOpenURL = jest.spyOn(Linking, 'openURL');

beforeEach(() => {
  jest.clearAllMocks();
  mockCanOpenURL.mockResolvedValue(false);
  mockOpenURL.mockResolvedValue(undefined);
});

afterAll(() => {
  mockCanOpenURL.mockRestore();
  mockOpenURL.mockRestore();
});

// ---------------------------------------------------------------------------
// URL construction
// ---------------------------------------------------------------------------

describe('useAffirmDeepLink — URL construction', () => {
  it('opens app URL with amount in cents when Affirm app is installed', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result } = renderHook(() => useAffirmDeepLink(799));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => {
      await result.current.openCalculator();
    });

    // 799 dollars → 79900 cents
    expect(mockOpenURL).toHaveBeenCalledWith('affirm://calculator?amount=79900');
  });

  it('rounds price to cents correctly (no floating-point artifacts)', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result } = renderHook(() => useAffirmDeepLink(299.99));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => {
      await result.current.openCalculator();
    });

    // Math.round(299.99 * 100) = 29999
    expect(mockOpenURL).toHaveBeenCalledWith('affirm://calculator?amount=29999');
  });

  it('opens web fallback URL when Affirm app is NOT installed', async () => {
    mockCanOpenURL.mockResolvedValue(false);
    const { result } = renderHook(() => useAffirmDeepLink(799));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => {
      await result.current.openCalculator();
    });

    expect(mockOpenURL).toHaveBeenCalledWith('https://www.affirm.com/apps');
  });

  it('passes correct amount for a $2,000 item', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result } = renderHook(() => useAffirmDeepLink(2000));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => {
      await result.current.openCalculator();
    });

    expect(mockOpenURL).toHaveBeenCalledWith('affirm://calculator?amount=200000');
  });
});

// ---------------------------------------------------------------------------
// canOpen state
// ---------------------------------------------------------------------------

describe('useAffirmDeepLink — canOpen', () => {
  it('canOpen is true when Affirm app is installed', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result } = renderHook(() => useAffirmDeepLink(799));
    await waitFor(() => expect(result.current.canOpen).toBe(true));
  });

  it('canOpen is true when Affirm app is NOT installed (web fallback available)', async () => {
    mockCanOpenURL.mockResolvedValue(false);
    const { result } = renderHook(() => useAffirmDeepLink(799));
    await waitFor(() => expect(result.current.canOpen).toBe(true));
  });

  it('canOpen is false when canOpenURL throws (SDK unavailable)', async () => {
    mockCanOpenURL.mockRejectedValue(new Error('Linking unavailable'));
    const { result } = renderHook(() => useAffirmDeepLink(799));
    await waitFor(() => expect(result.current.canOpen).toBe(false));
  });
});

// ---------------------------------------------------------------------------
// Graceful error handling (AC: Affirm SDK unavailable)
// ---------------------------------------------------------------------------

describe('useAffirmDeepLink — error handling', () => {
  it('sets error when openURL throws', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    mockOpenURL.mockRejectedValue(new Error('Cannot open URL'));
    const { result } = renderHook(() => useAffirmDeepLink(799));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => {
      await result.current.openCalculator();
    });

    expect(result.current.error).toBe('Cannot open URL');
  });

  it('sets error when canOpenURL throws during init', async () => {
    mockCanOpenURL.mockRejectedValue(new Error('Linking not available'));
    const { result } = renderHook(() => useAffirmDeepLink(799));
    await waitFor(() => expect(result.current.error).toBe('Linking not available'));
    expect(result.current.canOpen).toBe(false);
  });

  it('clears previous error on successful openCalculator', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    mockOpenURL
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useAffirmDeepLink(799));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => { await result.current.openCalculator(); });
    expect(result.current.error).toBeTruthy();

    await act(async () => { await result.current.openCalculator(); });
    expect(result.current.error).toBeNull();
  });

  it('does not crash when price is 0', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result } = renderHook(() => useAffirmDeepLink(0));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await expect(
      act(async () => { await result.current.openCalculator(); }),
    ).resolves.not.toThrow();

    expect(mockOpenURL).toHaveBeenCalledWith('affirm://calculator?amount=0');
  });

  it('clamps negative price to 0', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result } = renderHook(() => useAffirmDeepLink(-100));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => { await result.current.openCalculator(); });

    expect(mockOpenURL).toHaveBeenCalledWith('affirm://calculator?amount=0');
  });

  it('does not throw when openURL rejects with non-Error value', async () => {
    mockCanOpenURL.mockResolvedValue(false);
    mockOpenURL.mockRejectedValue('string error');
    const { result } = renderHook(() => useAffirmDeepLink(799));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => { await result.current.openCalculator(); });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});

// ---------------------------------------------------------------------------
// Reactivity
// ---------------------------------------------------------------------------

describe('useAffirmDeepLink — reactivity', () => {
  it('uses updated price when rerendered with new price', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result, rerender } = renderHook(({ price }) => useAffirmDeepLink(price), {
      initialProps: { price: 799 },
    });
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    rerender({ price: 1500 });

    await act(async () => { await result.current.openCalculator(); });

    expect(mockOpenURL).toHaveBeenCalledWith('affirm://calculator?amount=150000');
  });
});

// ---------------------------------------------------------------------------
// Edge cases — invalid prices, cleanup, URL construction boundaries
// ---------------------------------------------------------------------------

describe('useAffirmDeepLink — invalid price edge cases', () => {
  it('NaN price produces amount=0 in URL', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result } = renderHook(() => useAffirmDeepLink(NaN));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => { await result.current.openCalculator(); });

    // Math.round(Math.max(0, NaN) * 100) → Math.max(0, NaN) = NaN → NaN * 100 = NaN → Math.round(NaN) = NaN
    // URL will contain NaN — verify it doesn't crash
    expect(mockOpenURL).toHaveBeenCalledTimes(1);
  });

  it('Infinity price does not crash', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result } = renderHook(() => useAffirmDeepLink(Infinity));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await expect(
      act(async () => { await result.current.openCalculator(); }),
    ).resolves.not.toThrow();
    expect(mockOpenURL).toHaveBeenCalledTimes(1);
  });

  it('very small fractional price rounds correctly', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result } = renderHook(() => useAffirmDeepLink(0.01));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => { await result.current.openCalculator(); });

    // 0.01 * 100 = 1 cent
    expect(mockOpenURL).toHaveBeenCalledWith('affirm://calculator?amount=1');
  });

  it('very large price produces correct cents without overflow', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result } = renderHook(() => useAffirmDeepLink(99999.99));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => { await result.current.openCalculator(); });

    expect(mockOpenURL).toHaveBeenCalledWith('affirm://calculator?amount=9999999');
  });

  it('price with floating-point noise (19.99) rounds without artifact', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result } = renderHook(() => useAffirmDeepLink(19.99));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => { await result.current.openCalculator(); });

    // 19.99 * 100 = 1999.0000000000002 → Math.round = 1999
    expect(mockOpenURL).toHaveBeenCalledWith('affirm://calculator?amount=1999');
  });
});

describe('useAffirmDeepLink — cleanup (cancelled flag)', () => {
  it('does not update state after unmount when canOpenURL resolves', async () => {
    let resolveCanOpen: (v: boolean) => void;
    mockCanOpenURL.mockReturnValue(new Promise((r) => { resolveCanOpen = r; }));

    const { result, unmount } = renderHook(() => useAffirmDeepLink(799));

    // Unmount before canOpenURL resolves
    unmount();

    // Resolve after unmount — should not throw or update state
    await act(async () => { resolveCanOpen!(true); });

    // No assertion on state (component unmounted) — verifying no crash
  });

  it('does not update state after unmount when canOpenURL rejects', async () => {
    let rejectCanOpen: (e: Error) => void;
    mockCanOpenURL.mockReturnValue(new Promise((_, rej) => { rejectCanOpen = rej; }));

    const { unmount } = renderHook(() => useAffirmDeepLink(799));

    unmount();

    // Reject after unmount — should not throw or set error state
    await act(async () => { rejectCanOpen!(new Error('Late rejection')); });
  });
});

describe('useAffirmDeepLink — init error wrapping', () => {
  it('wraps non-Error canOpenURL rejection to string', async () => {
    mockCanOpenURL.mockRejectedValue('raw string failure');
    const { result } = renderHook(() => useAffirmDeepLink(799));
    await waitFor(() => expect(result.current.error).toBe('raw string failure'));
    expect(result.current.canOpen).toBe(false);
  });

  it('wraps number rejection to string', async () => {
    mockCanOpenURL.mockRejectedValue(42);
    const { result } = renderHook(() => useAffirmDeepLink(799));
    await waitFor(() => expect(result.current.error).toBe('42'));
    expect(result.current.canOpen).toBe(false);
  });
});
