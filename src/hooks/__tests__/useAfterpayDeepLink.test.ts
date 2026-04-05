/**
 * useAfterpayDeepLink TDD tests — hq-f5l
 *
 * Tests written BEFORE implementation per CLAUDE.md mandate.
 *
 * Hook opens the Afterpay app (native deep-link, web fallback)
 * pre-populated with the product price. Gracefully handles:
 *   - Afterpay app not installed → web fallback
 *   - Linking.openURL failure → sets error
 *   - Afterpay SDK/Linking entirely unavailable → error state, no crash
 *
 * App URL:  afterpay://
 * Web URL:  https://www.afterpay.com
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { useAfterpayDeepLink } from '../useAfterpayDeepLink';

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

describe('useAfterpayDeepLink — URL construction', () => {
  it('opens Afterpay app URL when app is installed', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result } = renderHook(() => useAfterpayDeepLink(299));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => {
      await result.current.openCalculator();
    });

    expect(mockOpenURL).toHaveBeenCalledWith(
      expect.stringContaining('afterpay://'),
    );
  });

  it('opens web fallback URL when Afterpay app is NOT installed', async () => {
    mockCanOpenURL.mockResolvedValue(false);
    const { result } = renderHook(() => useAfterpayDeepLink(299));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => {
      await result.current.openCalculator();
    });

    expect(mockOpenURL).toHaveBeenCalledWith('https://www.afterpay.com');
  });

  it('includes amount in cents in app URL', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result } = renderHook(() => useAfterpayDeepLink(299.99));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => {
      await result.current.openCalculator();
    });

    // Math.round(299.99 * 100) = 29999
    const calledUrl = (mockOpenURL.mock.calls[0] as string[])[0];
    expect(calledUrl).toContain('29999');
  });

  it('passes correct amount for a $200 item', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result } = renderHook(() => useAfterpayDeepLink(200));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => {
      await result.current.openCalculator();
    });

    const calledUrl = (mockOpenURL.mock.calls[0] as string[])[0];
    expect(calledUrl).toContain('20000');
  });
});

// ---------------------------------------------------------------------------
// canOpen state
// ---------------------------------------------------------------------------

describe('useAfterpayDeepLink — canOpen', () => {
  it('canOpen is true when Afterpay app is installed', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result } = renderHook(() => useAfterpayDeepLink(299));
    await waitFor(() => expect(result.current.canOpen).toBe(true));
  });

  it('canOpen is true when Afterpay app is NOT installed (web fallback available)', async () => {
    mockCanOpenURL.mockResolvedValue(false);
    const { result } = renderHook(() => useAfterpayDeepLink(299));
    await waitFor(() => expect(result.current.canOpen).toBe(true));
  });

  it('canOpen is false when canOpenURL throws (SDK unavailable)', async () => {
    mockCanOpenURL.mockRejectedValue(new Error('Linking unavailable'));
    const { result } = renderHook(() => useAfterpayDeepLink(299));
    await waitFor(() => expect(result.current.canOpen).toBe(false));
  });
});

// ---------------------------------------------------------------------------
// Graceful error handling (AC: Afterpay SDK unavailable)
// ---------------------------------------------------------------------------

describe('useAfterpayDeepLink — error handling', () => {
  it('sets error when openURL throws', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    mockOpenURL.mockRejectedValue(new Error('Cannot open URL'));
    const { result } = renderHook(() => useAfterpayDeepLink(299));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => {
      await result.current.openCalculator();
    });

    expect(result.current.error).toBe('Cannot open URL');
  });

  it('sets error when canOpenURL throws during init', async () => {
    mockCanOpenURL.mockRejectedValue(new Error('Linking not available'));
    const { result } = renderHook(() => useAfterpayDeepLink(299));
    await waitFor(() => expect(result.current.error).toBe('Linking not available'));
    expect(result.current.canOpen).toBe(false);
  });

  it('clears previous error on successful openCalculator', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    mockOpenURL
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useAfterpayDeepLink(299));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => { await result.current.openCalculator(); });
    expect(result.current.error).toBeTruthy();

    await act(async () => { await result.current.openCalculator(); });
    expect(result.current.error).toBeNull();
  });

  it('does not crash when price is 0', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result } = renderHook(() => useAfterpayDeepLink(0));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await expect(
      act(async () => { await result.current.openCalculator(); }),
    ).resolves.not.toThrow();
  });

  it('clamps negative price to 0', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result } = renderHook(() => useAfterpayDeepLink(-50));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => { await result.current.openCalculator(); });

    const calledUrl = (mockOpenURL.mock.calls[0] as string[])[0];
    expect(calledUrl).toContain('0');
  });

  it('does not throw when openURL rejects with non-Error value', async () => {
    mockCanOpenURL.mockResolvedValue(false);
    mockOpenURL.mockRejectedValue('string error');
    const { result } = renderHook(() => useAfterpayDeepLink(299));
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    await act(async () => { await result.current.openCalculator(); });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});

// ---------------------------------------------------------------------------
// Reactivity
// ---------------------------------------------------------------------------

describe('useAfterpayDeepLink — reactivity', () => {
  it('uses updated price when rerendered with new price', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const { result, rerender } = renderHook(({ price }) => useAfterpayDeepLink(price), {
      initialProps: { price: 299 },
    });
    await waitFor(() => expect(result.current.canOpen).toBe(true));

    rerender({ price: 500 });

    await act(async () => { await result.current.openCalculator(); });

    const calledUrl = (mockOpenURL.mock.calls[0] as string[])[0];
    expect(calledUrl).toContain('50000');
  });
});
