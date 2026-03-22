/**
 * Tests for useProductShippingEstimate — cm-9yn
 * TDD: tests written before implementation.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProductShippingEstimate } from '../useProductShippingEstimate';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockGetShippingEstimate = jest.fn();

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => ({
    getShippingEstimate: mockGetShippingEstimate,
  }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DIMS = { width: 60, depth: 36, height: 35 };
const PRODUCT_ID = 'prod-001';
const ZIP = '28801';

const PARCEL_RESPONSE = {
  success: true,
  rate: '49.00',
  carrier: 'UPS',
  serviceLevel: 'parcel',
  isEstimate: false,
  isFreight: false,
};

const FREIGHT_RESPONSE = {
  success: true,
  rate: '225.00',
  carrier: 'R+L Carriers',
  serviceLevel: 'freight',
  isEstimate: true,
  isFreight: true,
};

function renderEstimate(productId = PRODUCT_ID, dimensions = DIMS) {
  return renderHook(() => useProductShippingEstimate({ productId, dimensions }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useProductShippingEstimate (cm-9yn)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('starts with empty zip, no rate, not loading', () => {
    const { result } = renderEstimate();
    expect(result.current.zip).toBe('');
    expect(result.current.rate).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('does not call API when zip is empty', async () => {
    renderEstimate();
    await waitFor(() => {});
    expect(mockGetShippingEstimate).not.toHaveBeenCalled();
  });

  // ── Zip persistence ────────────────────────────────────────────────────────

  it('loads persisted zip from AsyncStorage on mount', async () => {
    mockGetShippingEstimate.mockResolvedValue(PARCEL_RESPONSE);
    await AsyncStorage.setItem('shipping_zip', ZIP);
    const { result } = renderEstimate();
    await waitFor(() => expect(result.current.zip).toBe(ZIP));
  });

  it('persists zip to AsyncStorage when setZip is called', async () => {
    mockGetShippingEstimate.mockResolvedValue(PARCEL_RESPONSE);
    const { result } = renderEstimate();
    result.current.setZip(ZIP);
    await waitFor(async () => {
      const stored = await AsyncStorage.getItem('shipping_zip');
      expect(stored).toBe(ZIP);
    });
  });

  // ── API call ───────────────────────────────────────────────────────────────

  it('calls getShippingEstimate with zip, productId and dims when zip is set', async () => {
    mockGetShippingEstimate.mockResolvedValueOnce(PARCEL_RESPONSE);
    const { result } = renderEstimate();
    result.current.setZip(ZIP);

    await waitFor(() => expect(mockGetShippingEstimate).toHaveBeenCalledTimes(1));
    expect(mockGetShippingEstimate).toHaveBeenCalledWith({
      zip: ZIP,
      productId: PRODUCT_ID,
      dimensions: DIMS,
    });
  });

  it('sets rate from successful parcel API response', async () => {
    mockGetShippingEstimate.mockResolvedValueOnce(PARCEL_RESPONSE);
    const { result } = renderEstimate();
    result.current.setZip(ZIP);

    await waitFor(() => expect(result.current.rate).not.toBeNull());
    expect(result.current.rate).toMatchObject({
      amount: '49.00',
      carrier: 'UPS',
      serviceLevel: 'parcel',
      isEstimate: false,
      isFreight: false,
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets isEstimate=true and isFreight=true for freight response', async () => {
    mockGetShippingEstimate.mockResolvedValueOnce(FREIGHT_RESPONSE);
    const { result } = renderEstimate();
    result.current.setZip(ZIP);

    await waitFor(() => expect(result.current.rate).not.toBeNull());
    expect(result.current.rate?.isEstimate).toBe(true);
    expect(result.current.rate?.isFreight).toBe(true);
    expect(result.current.rate?.amount).toBe('225.00');
  });

  // ── isLoading ──────────────────────────────────────────────────────────────

  it('sets isLoading=true while API is in flight then false on resolve', async () => {
    let resolve!: (v: unknown) => void;
    mockGetShippingEstimate.mockReturnValueOnce(new Promise((r) => { resolve = r; }));

    const { result } = renderEstimate();
    result.current.setZip(ZIP);

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    resolve(PARCEL_RESPONSE);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it('sets error when API throws, clears rate and isLoading', async () => {
    mockGetShippingEstimate.mockRejectedValueOnce(new Error('network error'));
    const { result } = renderEstimate();
    result.current.setZip(ZIP);

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('network error');
    expect(result.current.rate).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error when API returns success=false', async () => {
    mockGetShippingEstimate.mockResolvedValueOnce({ success: false, error: 'Invalid zip code' });
    const { result } = renderEstimate();
    result.current.setZip(ZIP);

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.rate).toBeNull();
  });

  // ── Stale request cancellation ─────────────────────────────────────────────

  it('ignores stale response when productId changes before resolution', async () => {
    let resolveStale!: (v: unknown) => void;
    mockGetShippingEstimate
      .mockReturnValueOnce(new Promise((r) => { resolveStale = r; }))
      .mockResolvedValueOnce({ ...PARCEL_RESPONSE, rate: '55.00', carrier: 'FedEx' });

    const { result, rerender } = renderHook(
      ({ productId }: { productId: string }) =>
        useProductShippingEstimate({ productId, dimensions: DIMS }),
      { initialProps: { productId: 'prod-001' } },
    );

    result.current.setZip(ZIP);
    await waitFor(() => expect(result.current.isLoading).toBe(true));

    // Swap product — triggers second call
    rerender({ productId: 'prod-002' });

    // Resolve stale first request
    resolveStale(PARCEL_RESPONSE); // rate: 49.00 from old product

    await waitFor(() => expect(result.current.rate?.amount).toBe('55.00'));
    expect(result.current.rate?.amount).not.toBe('49.00');
  });

  // ── No wix client ──────────────────────────────────────────────────────────

  it('handles sync throw from getShippingEstimate without crashing', async () => {
    // Simulate client that throws synchronously
    mockGetShippingEstimate.mockImplementationOnce(() => {
      throw new Error('getShippingEstimate not available');
    });

    const { result } = renderEstimate();
    result.current.setZip(ZIP);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Error is set, rate stays null — screen does not crash
    expect(result.current.rate).toBeNull();
    expect(result.current.error?.message).toBe('getShippingEstimate not available');
  });

  // ── Zip validation ─────────────────────────────────────────────────────────

  it('does not call API for zip shorter than 5 digits', async () => {
    const { result } = renderEstimate();
    result.current.setZip('123');
    await waitFor(() => {});
    expect(mockGetShippingEstimate).not.toHaveBeenCalled();
  });

  it('calls API for a valid 5-digit zip', async () => {
    mockGetShippingEstimate.mockResolvedValueOnce(PARCEL_RESPONSE);
    const { result } = renderEstimate();
    result.current.setZip('90210');
    await waitFor(() => expect(mockGetShippingEstimate).toHaveBeenCalledTimes(1));
  });

  // ── cm-bundle-incentive: itemCount + upsellMessage ──────────────────────────

  it('passes itemCount to API when provided', async () => {
    mockGetShippingEstimate.mockResolvedValueOnce(PARCEL_RESPONSE);
    const { result } = renderHook(() =>
      useProductShippingEstimate({ productId: PRODUCT_ID, dimensions: DIMS, itemCount: 3 }),
    );
    result.current.setZip(ZIP);
    await waitFor(() => expect(mockGetShippingEstimate).toHaveBeenCalledTimes(1));
    expect(mockGetShippingEstimate).toHaveBeenCalledWith(
      expect.objectContaining({ itemCount: 3 }),
    );
  });

  it('does not pass itemCount when not provided', async () => {
    mockGetShippingEstimate.mockResolvedValueOnce(PARCEL_RESPONSE);
    const { result } = renderEstimate();
    result.current.setZip(ZIP);
    await waitFor(() => expect(mockGetShippingEstimate).toHaveBeenCalledTimes(1));
    const callArg = mockGetShippingEstimate.mock.calls[0][0];
    expect(callArg.itemCount).toBeUndefined();
  });

  it('maps upsellMessage from API response into rate', async () => {
    mockGetShippingEstimate.mockResolvedValueOnce({
      ...PARCEL_RESPONSE,
      upsellMessage: 'Bundle savings — already paying for freight, add more at no extra cost',
    });
    const { result } = renderHook(() =>
      useProductShippingEstimate({ productId: PRODUCT_ID, dimensions: DIMS, itemCount: 2 }),
    );
    result.current.setZip(ZIP);
    await waitFor(() => expect(result.current.rate).not.toBeNull());
    expect(result.current.rate?.upsellMessage).toBe(
      'Bundle savings — already paying for freight, add more at no extra cost',
    );
  });

  it('rate.upsellMessage is null when API returns no upsellMessage', async () => {
    mockGetShippingEstimate.mockResolvedValueOnce(PARCEL_RESPONSE);
    const { result } = renderEstimate();
    result.current.setZip(ZIP);
    await waitFor(() => expect(result.current.rate).not.toBeNull());
    expect(result.current.rate?.upsellMessage).toBeNull();
  });
});
