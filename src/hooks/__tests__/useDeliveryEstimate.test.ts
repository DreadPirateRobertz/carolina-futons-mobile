/**
 * @module useDeliveryEstimate tests
 *
 * TDD for cm-uyd: Delivery Estimator — mobile UI consuming
 * godfrey's getDeliveryEstimate webMethod.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useDeliveryEstimate } from '../useDeliveryEstimate';

const mockFetchDeliveryEstimate = jest.fn();
let mockWixClient: { fetchDeliveryEstimate: jest.Mock } | null = {
  fetchDeliveryEstimate: mockFetchDeliveryEstimate,
};

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

const SUCCESS_UPS = {
  success: true,
  estimate: '5-7 business days',
  minDays: 5,
  maxDays: 7,
  minDate: '2026-03-27',
  maxDate: '2026-03-31',
  source: 'ups',
  service: 'UPS Ground',
};

const SUCCESS_FALLBACK = {
  success: true,
  estimate: '2-5 business days',
  minDays: null,
  maxDays: null,
  minDate: null,
  maxDate: null,
  source: 'fallback',
  service: null,
};

describe('useDeliveryEstimate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWixClient = { fetchDeliveryEstimate: mockFetchDeliveryEstimate };
  });

  it('returns idle state when no zip provided', () => {
    const { result } = renderHook(() => useDeliveryEstimate('', ['prod-1']));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.estimate).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns idle state when no productIds provided', () => {
    const { result } = renderHook(() => useDeliveryEstimate('28801', []));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.estimate).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('calls fetchDeliveryEstimate with zip and productIds', async () => {
    mockFetchDeliveryEstimate.mockResolvedValue(SUCCESS_UPS);

    const { result } = renderHook(() => useDeliveryEstimate('28801', ['prod-1']));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetchDeliveryEstimate).toHaveBeenCalledWith('28801', ['prod-1']);
    expect(result.current.estimate).toBeTruthy();
  });

  it('shows isLoading while fetching', async () => {
    let resolve: (v: unknown) => void = () => {};
    mockFetchDeliveryEstimate.mockReturnValue(new Promise((r) => (resolve = r)));

    const { result } = renderHook(() => useDeliveryEstimate('28801', ['prod-1']));

    expect(result.current.isLoading).toBe(true);

    act(() => {
      resolve(SUCCESS_FALLBACK);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('formats date range when minDate/maxDate are present', async () => {
    mockFetchDeliveryEstimate.mockResolvedValue(SUCCESS_UPS);

    const { result } = renderHook(() => useDeliveryEstimate('28801', ['prod-1']));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.estimate?.displayText).toMatch(/Mar 2[0-9]/);
  });

  it('uses fallback copy when source is fallback', async () => {
    mockFetchDeliveryEstimate.mockResolvedValue(SUCCESS_FALLBACK);

    const { result } = renderHook(() => useDeliveryEstimate('28801', ['prod-1']));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.estimate?.displayText).toContain('2-5 business days');
    expect(result.current.estimate?.isFallback).toBe(true);
  });

  it('sets error when API returns success: false', async () => {
    mockFetchDeliveryEstimate.mockResolvedValue({ success: false, error: 'Invalid zip code' });

    const { result } = renderHook(() => useDeliveryEstimate('999', ['prod-1']));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Invalid zip code');
    expect(result.current.estimate).toBeNull();
  });

  it('sets error on network failure', async () => {
    mockFetchDeliveryEstimate.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDeliveryEstimate('28801', ['prod-1']));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.estimate).toBeNull();
  });

  it('clears error and re-fetches when zip changes', async () => {
    mockFetchDeliveryEstimate.mockRejectedValueOnce(new Error('bad zip'));
    mockFetchDeliveryEstimate.mockResolvedValueOnce(SUCCESS_FALLBACK);

    const { result, rerender } = renderHook(({ zip }) => useDeliveryEstimate(zip, ['prod-1']), {
      initialProps: { zip: '000' },
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();

    rerender({ zip: '28801' });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.estimate).toBeTruthy();
  });

  it('refresh() triggers a re-fetch', async () => {
    mockFetchDeliveryEstimate
      .mockResolvedValueOnce({ success: false, error: 'timeout' })
      .mockResolvedValueOnce(SUCCESS_UPS);

    const { result } = renderHook(() => useDeliveryEstimate('28801', ['prod-1']));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.estimate).toBeTruthy();
  });

  it('returns static fallback estimate when no wix client available', () => {
    mockWixClient = null;

    const { result } = renderHook(() => useDeliveryEstimate('28801', ['prod-1']));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.estimate?.displayText).toContain('business day');
    expect(result.current.estimate?.isFallback).toBe(true);
  });
});
