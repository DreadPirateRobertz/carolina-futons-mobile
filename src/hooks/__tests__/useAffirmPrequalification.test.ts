/**
 * TDD tests for useAffirmPrequalification hook.
 *
 * Hook behaviour:
 *  - Checks Affirm eligibility against BNPL_PROVIDERS.affirm limits
 *  - Calls checkAffirmPrequalification API when amount is in eligible range
 *  - Returns { isEligible, isLoading, error, checkoutUrl } shape
 *  - isLoading=true during async check
 *  - Skips API call when amount is outside Affirm range
 *  - Error state propagated from service
 *
 * Covers:
 *  - Initial state: isLoading=false, isEligible=false
 *  - Amount below minimum → not eligible, no API call
 *  - Amount in range → calls API, returns eligible
 *  - Amount in range → calls API, returns not eligible
 *  - API error → isEligible=false, error set
 *  - Null wixClient → not eligible
 *  - isLoading=true while check runs
 *  - Re-checks when amount changes
 *
 * Bead: cm-d7l
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useAffirmPrequalification } from '../useAffirmPrequalification';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: jest.fn(),
}));

const mockCheckPrequal = jest.fn();

jest.mock('@/services/affirmService', () => ({
  checkAffirmPrequalification: (...args: any[]) => mockCheckPrequal(...args),
  AFFIRM_MIN_AMOUNT: 50,
  AFFIRM_MAX_AMOUNT: 30000,
}));

import { useOptionalWixClient } from '@/services/wix';

const mockUseOptionalWixClient = useOptionalWixClient as jest.Mock;

const mockWixClient = { callAffirmPrequal: jest.fn() };

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useAffirmPrequalification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOptionalWixClient.mockReturnValue(mockWixClient);
  });

  it('starts with isLoading=false and isEligible=false before any check', () => {
    const { result } = renderHook(() => useAffirmPrequalification(0));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isEligible).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('is not eligible and does not call API when amount is below minimum', async () => {
    const { result } = renderHook(() => useAffirmPrequalification(10)); // below $50

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEligible).toBe(false);
    expect(mockCheckPrequal).not.toHaveBeenCalled();
  });

  it('is not eligible when amount is zero', async () => {
    const { result } = renderHook(() => useAffirmPrequalification(0));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEligible).toBe(false);
    expect(mockCheckPrequal).not.toHaveBeenCalled();
  });

  it('is not eligible and does not call API when amount exceeds maximum', async () => {
    const { result } = renderHook(() => useAffirmPrequalification(31000)); // above $30k

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEligible).toBe(false);
    expect(mockCheckPrequal).not.toHaveBeenCalled();
  });

  it('calls API and returns eligible=true when amount is in range and API confirms', async () => {
    mockCheckPrequal.mockResolvedValue({ eligible: true, error: undefined });

    const { result } = renderHook(() => useAffirmPrequalification(499));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockCheckPrequal).toHaveBeenCalledTimes(1);
    expect(result.current.isEligible).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('returns eligible=false when API says not qualified', async () => {
    mockCheckPrequal.mockResolvedValue({ eligible: false, error: undefined });

    const { result } = renderHook(() => useAffirmPrequalification(499));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEligible).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error and isEligible=false when API throws', async () => {
    mockCheckPrequal.mockResolvedValue({ eligible: false, error: 'Service unavailable' });

    const { result } = renderHook(() => useAffirmPrequalification(499));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEligible).toBe(false);
    expect(result.current.error).toBe('Service unavailable');
  });

  it('is not eligible when wixClient is null', async () => {
    mockUseOptionalWixClient.mockReturnValue(null);

    const { result } = renderHook(() => useAffirmPrequalification(499));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEligible).toBe(false);
    expect(mockCheckPrequal).not.toHaveBeenCalled();
  });

  it('sets isLoading=true while the check is in progress', async () => {
    let resolvePrequal!: (val: any) => void;
    mockCheckPrequal.mockReturnValue(new Promise((resolve) => { resolvePrequal = resolve; }));

    const { result } = renderHook(() => useAffirmPrequalification(499));

    // Should be loading while promise is pending
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    // Resolve the promise
    act(() => { resolvePrequal({ eligible: true, error: undefined }); });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEligible).toBe(true);
  });

  it('re-runs the check when amount changes from ineligible to eligible range', async () => {
    mockCheckPrequal.mockResolvedValue({ eligible: true, error: undefined });

    const { result, rerender } = renderHook(
      ({ amount }: { amount: number }) => useAffirmPrequalification(amount),
      { initialProps: { amount: 10 } }, // below min
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isEligible).toBe(false);
    expect(mockCheckPrequal).not.toHaveBeenCalled();

    // Change to eligible amount
    rerender({ amount: 499 });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isEligible).toBe(true);
    expect(mockCheckPrequal).toHaveBeenCalledTimes(1);
  });
});
