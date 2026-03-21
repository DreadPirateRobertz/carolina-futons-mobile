/**
 * TDD tests for useInventoryBadge hook — cm-91s
 *
 * Badge logic:
 *   - quantity 1–5 → 'low_stock' ("Only X left")
 *   - quantity ≥ 6 → 'none'
 *   - quantity === 0, inStock=true → 'just_restocked' ("Just restocked")
 *   - quantity === 0, inStock=false → 'none' (truly out of stock)
 *   - no productId → 'none', no API call
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useInventoryBadge } from '../useInventoryBadge';

const mockGetInventoryStatus = jest.fn();

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: jest.fn(() => ({ getInventoryStatus: mockGetInventoryStatus })),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useOptionalWixClient } = require('@/services/wix/wixProvider') as {
  useOptionalWixClient: jest.Mock;
};

describe('useInventoryBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOptionalWixClient.mockReturnValue({ getInventoryStatus: mockGetInventoryStatus });
  });

  // ── Initial state ──────────────────────────────────────────────

  it('starts with badge=none and isLoading=true', () => {
    mockGetInventoryStatus.mockResolvedValue({ inStock: true, totalQuantity: 3, variants: [] });
    const { result } = renderHook(() => useInventoryBadge('prod-1'));
    expect(result.current.badge).toBe('none');
    expect(result.current.isLoading).toBe(true);
  });

  it('returns badge=none with no loading when productId is empty', () => {
    const { result } = renderHook(() => useInventoryBadge(''));
    expect(result.current.badge).toBe('none');
    expect(result.current.isLoading).toBe(false);
    expect(mockGetInventoryStatus).not.toHaveBeenCalled();
  });

  it('returns badge=none with no loading when productId is undefined', () => {
    const { result } = renderHook(() => useInventoryBadge(undefined));
    expect(result.current.badge).toBe('none');
    expect(result.current.isLoading).toBe(false);
    expect(mockGetInventoryStatus).not.toHaveBeenCalled();
  });

  // ── Low stock badge ────────────────────────────────────────────

  it('returns low_stock badge when quantity is 1', async () => {
    mockGetInventoryStatus.mockResolvedValue({ inStock: true, totalQuantity: 1, variants: [] });
    const { result } = renderHook(() => useInventoryBadge('prod-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.badge).toBe('low_stock');
    expect(result.current.quantity).toBe(1);
  });

  it('returns low_stock badge when quantity is 5', async () => {
    mockGetInventoryStatus.mockResolvedValue({ inStock: true, totalQuantity: 5, variants: [] });
    const { result } = renderHook(() => useInventoryBadge('prod-5'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.badge).toBe('low_stock');
    expect(result.current.quantity).toBe(5);
  });

  it('returns low_stock badge when quantity is 3', async () => {
    mockGetInventoryStatus.mockResolvedValue({ inStock: true, totalQuantity: 3, variants: [] });
    const { result } = renderHook(() => useInventoryBadge('prod-3'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.badge).toBe('low_stock');
  });

  // ── No badge (well-stocked) ────────────────────────────────────

  it('returns none badge when quantity is 6', async () => {
    mockGetInventoryStatus.mockResolvedValue({ inStock: true, totalQuantity: 6, variants: [] });
    const { result } = renderHook(() => useInventoryBadge('prod-6'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.badge).toBe('none');
  });

  it('returns none badge when quantity is large', async () => {
    mockGetInventoryStatus.mockResolvedValue({ inStock: true, totalQuantity: 100, variants: [] });
    const { result } = renderHook(() => useInventoryBadge('prod-100'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.badge).toBe('none');
  });

  // ── Just restocked badge ───────────────────────────────────────

  it('returns just_restocked when quantity=0 and inStock=true', async () => {
    mockGetInventoryStatus.mockResolvedValue({ inStock: true, totalQuantity: 0, variants: [] });
    const { result } = renderHook(() => useInventoryBadge('prod-restock'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.badge).toBe('just_restocked');
  });

  it('returns none when quantity=0 and inStock=false (truly out of stock)', async () => {
    mockGetInventoryStatus.mockResolvedValue({ inStock: false, totalQuantity: 0, variants: [] });
    const { result } = renderHook(() => useInventoryBadge('prod-oos'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.badge).toBe('none');
  });

  // ── Error handling ─────────────────────────────────────────────

  it('returns badge=none and isLoading=false on API error', async () => {
    mockGetInventoryStatus.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useInventoryBadge('prod-err'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.badge).toBe('none');
  });

  it('returns badge=none and error message on API failure', async () => {
    mockGetInventoryStatus.mockRejectedValue(new Error('Wix API 503'));
    const { result } = renderHook(() => useInventoryBadge('prod-err'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.badge).toBe('none');
    expect(result.current.error).toBeTruthy();
  });

  // ── No Wix client ──────────────────────────────────────────────

  it('returns badge=none and isLoading=false when wixClient is null', () => {
    useOptionalWixClient.mockReturnValue(null);
    const { result } = renderHook(() => useInventoryBadge('prod-1'));
    expect(result.current.badge).toBe('none');
    expect(result.current.isLoading).toBe(false);
    expect(mockGetInventoryStatus).not.toHaveBeenCalled();
  });

  // ── Boundary: exactly LOW_STOCK_THRESHOLD ─────────────────────

  it('calls getInventoryStatus with the given productId', async () => {
    mockGetInventoryStatus.mockResolvedValue({ inStock: true, totalQuantity: 2, variants: [] });
    renderHook(() => useInventoryBadge('prod-xyz'));
    await waitFor(() => expect(mockGetInventoryStatus).toHaveBeenCalledWith('prod-xyz'));
  });
});
