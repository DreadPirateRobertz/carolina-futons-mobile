/**
 * Tests for useCartItemDeliveryEstimate — cm-afc.
 * TDD: tests written before implementation.
 *
 * Covers:
 * - no-zip state when nothing stored
 * - local/parcel/freight based on zip + item dimensions
 * - displayText mapping per mode
 * - AsyncStorage load error → no-zip
 * - isLoading transitions
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCartItemDeliveryEstimate } from '../useCartItemDeliveryEstimate';
import type { CartItem } from '../useCart';
import { FUTON_MODELS, FABRICS } from '@/data/futons';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const STORAGE_KEY = 'shipping_zip';

// Parcel-size item: Pisgah Twin (39" wide)
const twin = FUTON_MODELS.find((m) => m.dimensions.width === 39) ?? FUTON_MODELS[0];
// Freight-size item: Asheville Full (54") or Blue Ridge Queen (60")
const full = FUTON_MODELS.find((m) => m.dimensions.width >= 54) ?? FUTON_MODELS[1];
const linen = FABRICS[0];

function makeItem(model: typeof twin): CartItem {
  return {
    id: `${model.id}:${linen.id}`,
    model,
    fabric: linen,
    quantity: 1,
    unitPrice: model.basePrice,
  };
}

const parcelItem = makeItem(twin);
const freightItem = makeItem(full);

describe('useCartItemDeliveryEstimate (cm-afc)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  // ── Loading state ──────────────────────────────────────────────────────────

  it('starts in loading state', () => {
    const { result } = renderHook(() => useCartItemDeliveryEstimate(parcelItem));
    expect(result.current.isLoading).toBe(true);
  });

  it('clears loading after AsyncStorage resolves', async () => {
    const { result } = renderHook(() => useCartItemDeliveryEstimate(parcelItem));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  // ── no-zip state ───────────────────────────────────────────────────────────

  it('returns no-zip mode when no zip is stored', async () => {
    const { result } = renderHook(() => useCartItemDeliveryEstimate(parcelItem));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mode).toBe('no-zip');
  });

  it('returns null displayText for no-zip', async () => {
    const { result } = renderHook(() => useCartItemDeliveryEstimate(parcelItem));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.displayText).toBeNull();
  });

  it('returns no-zip when stored zip is invalid', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'bad');
    const { result } = renderHook(() => useCartItemDeliveryEstimate(parcelItem));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mode).toBe('no-zip');
  });

  it('returns no-zip on AsyncStorage read error', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage failure'));
    const { result } = renderHook(() => useCartItemDeliveryEstimate(parcelItem));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mode).toBe('no-zip');
  });

  // ── local state ────────────────────────────────────────────────────────────

  it('returns local mode for NC zip with parcel-size item', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '28801');
    const { result } = renderHook(() => useCartItemDeliveryEstimate(parcelItem));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mode).toBe('local');
  });

  it('returns "2–3 business days" displayText for local mode', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '28801');
    const { result } = renderHook(() => useCartItemDeliveryEstimate(parcelItem));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.displayText).toBe('2–3 business days');
  });

  it('returns local mode for SC zip', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '29201');
    const { result } = renderHook(() => useCartItemDeliveryEstimate(parcelItem));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mode).toBe('local');
  });

  // ── parcel state ───────────────────────────────────────────────────────────

  it('returns parcel mode for national zip with small item', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '10001');
    const { result } = renderHook(() => useCartItemDeliveryEstimate(parcelItem));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mode).toBe('parcel');
  });

  it('returns non-null displayText for parcel mode', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '10001');
    const { result } = renderHook(() => useCartItemDeliveryEstimate(parcelItem));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.displayText).toBeTruthy();
  });

  it('returns "5–7 business days" for NYC zip', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '10001');
    const { result } = renderHook(() => useCartItemDeliveryEstimate(parcelItem));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.displayText).toBe('5–7 business days');
  });

  it('returns "3–5 business days" for Southeast zip (30301)', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '30301');
    const { result } = renderHook(() => useCartItemDeliveryEstimate(parcelItem));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.displayText).toBe('3–5 business days');
  });

  // ── freight state ──────────────────────────────────────────────────────────

  it('returns freight mode for full-size item (width >= 54") at any valid zip', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '10001');
    const { result } = renderHook(() => useCartItemDeliveryEstimate(freightItem));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mode).toBe('freight');
  });

  it('returns freight mode even at local NC zip for large item', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '28801');
    const { result } = renderHook(() => useCartItemDeliveryEstimate(freightItem));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mode).toBe('freight');
  });

  it('returns non-null displayText for freight mode', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '10001');
    const { result } = renderHook(() => useCartItemDeliveryEstimate(freightItem));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.displayText).toBeTruthy();
  });

  // ── zip is returned ────────────────────────────────────────────────────────

  it('exposes the loaded zip', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '28801');
    const { result } = renderHook(() => useCartItemDeliveryEstimate(parcelItem));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.zip).toBe('28801');
  });

  it('exposes empty string when no zip stored', async () => {
    const { result } = renderHook(() => useCartItemDeliveryEstimate(parcelItem));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.zip).toBe('');
  });
});
