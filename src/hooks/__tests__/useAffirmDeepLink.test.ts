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
