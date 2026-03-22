import { renderHook, waitFor } from '@testing-library/react-native';
import { useShippingEstimate } from '../useShippingEstimate';

// Mock wixProvider
const mockFetchShippingEstimate = jest.fn();
const mockUseOptionalWixClient = jest.fn(() => null);
jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

// Mock useAddressBook
const mockUseAddressBook = jest.fn<{ defaultAddress: { zip: string } | null }, []>(() => ({
  defaultAddress: null,
}));
jest.mock('@/hooks/useAddressBook', () => ({
  useAddressBook: () => mockUseAddressBook(),
}));

// Mock deliveryEstimate fallback utility
jest.mock('@/utils/deliveryEstimate', () => ({
  getDeliveryEstimate: (zip: string) => {
    const prefix = parseInt(zip.slice(0, 3), 10);
    if (prefix >= 270 && prefix <= 299) return '2–3 business days';
    if (prefix >= 200 && prefix <= 399) return '3–5 business days';
    return '5–7 business days';
  },
}));

const DEFAULT_ZIP = '28801';
const PRODUCT_ID = 'prod-asheville-full';

function makeWixOption(
  overrides: Partial<{
    icon: string;
    deliveryTime: string;
    badge: string | null;
    badgeStyle: string | null;
  }> = {},
) {
  return {
    code: 'UPS_GROUND',
    title: '📦 UPS Ground',
    price: '0.00',
    currency: 'USD',
    deliveryTime: '5–7 business days',
    badge: null,
    badgeStyle: null,
    upsellMessage: null,
    highlight: false,
    icon: '📦',
    ...overrides,
  };
}

describe('useShippingEstimate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOptionalWixClient.mockReturnValue(null);
    mockUseAddressBook.mockReturnValue({ defaultAddress: null });
  });

  describe('without Wix client — local fallback', () => {
    it('returns fallback estimate using default NC zip when no address saved', async () => {
      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.label).toBe('2–3 business days');
      expect(result.current.icon).toBe('🚚');
      expect(result.current.badge).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('uses stored ZIP from defaultAddress for fallback estimate', async () => {
      // ZIP 10001 (NY) → 5–7 business days
      mockUseAddressBook.mockReturnValue({ defaultAddress: { zip: '10001' } });

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.label).toBe('5–7 business days');
    });

    it('uses southeast ZIP for mid-range estimate', async () => {
      mockUseAddressBook.mockReturnValue({ defaultAddress: { zip: '30301' } }); // Atlanta

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.label).toBe('3–5 business days');
    });

    it('falls back to default ZIP when defaultAddress has no zip', async () => {
      mockUseAddressBook.mockReturnValue({ defaultAddress: { zip: '' } });

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Default 28801 (NC) → local tier
      expect(result.current.label).toBe('2–3 business days');
    });

    it('does not call fetchShippingEstimate when no wix client', async () => {
      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetchShippingEstimate).not.toHaveBeenCalled();
    });
  });

  describe('with Wix client — live API', () => {
    beforeEach(() => {
      mockUseOptionalWixClient.mockReturnValue({
        fetchShippingEstimate: mockFetchShippingEstimate,
      } as any);
    });

    it('calls fetchShippingEstimate with zip and productId', async () => {
      mockFetchShippingEstimate.mockResolvedValue({
        success: true,
        options: [makeWixOption()],
      });

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockFetchShippingEstimate).toHaveBeenCalledWith(
        DEFAULT_ZIP,
        expect.arrayContaining([expect.objectContaining({ productId: PRODUCT_ID })]),
      );
    });

    it('uses stored ZIP when address is saved', async () => {
      mockUseAddressBook.mockReturnValue({ defaultAddress: { zip: '90210' } });
      mockFetchShippingEstimate.mockResolvedValue({
        success: true,
        options: [makeWixOption({ deliveryTime: '5–7 business days' })],
      });

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockFetchShippingEstimate).toHaveBeenCalledWith('90210', expect.any(Array));
    });

    it('returns icon, label, badge, badgeStyle from first API option', async () => {
      mockFetchShippingEstimate.mockResolvedValue({
        success: true,
        options: [
          makeWixOption({
            icon: '🏔️',
            deliveryTime: '2–3 business days',
            badge: 'Local Delivery',
            badgeStyle: 'local',
          }),
        ],
      });

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.icon).toBe('🏔️');
      expect(result.current.label).toBe('2–3 business days');
      expect(result.current.badge).toBe('Local Delivery');
      expect(result.current.badgeStyle).toBe('local');
      expect(result.current.error).toBeNull();
    });

    it('falls back to local estimate when API returns success:false', async () => {
      mockFetchShippingEstimate.mockResolvedValue({
        success: false,
        options: [],
        error: 'Service unavailable',
      });

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.label).toBe('2–3 business days'); // default NC zip fallback
      expect(result.current.error).toBeNull(); // silent degradation
    });

    it('falls back to local estimate when API returns empty options', async () => {
      mockFetchShippingEstimate.mockResolvedValue({ success: true, options: [] });

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.label).toBe('2–3 business days');
    });

    it('falls back to local estimate when API throws', async () => {
      mockFetchShippingEstimate.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.label).toBe('2–3 business days');
      expect(result.current.error).toBeNull(); // silent degradation — never block UI
    });

    it('sets isLoading=true then false', async () => {
      let resolve!: (v: { success: boolean; options: unknown[] }) => void;
      mockFetchShippingEstimate.mockReturnValue(
        new Promise((r) => {
          resolve = r;
        }),
      );

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      expect(result.current.isLoading).toBe(true);

      resolve({ success: true, options: [makeWixOption()] });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
  });

  describe('edge cases', () => {
    it('returns null label when productId is empty string', async () => {
      const { result } = renderHook(() => useShippingEstimate(''));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.label).toBeNull();
    });

    it('re-fetches when productId changes', async () => {
      mockUseOptionalWixClient.mockReturnValue({
        fetchShippingEstimate: mockFetchShippingEstimate,
      } as any);
      mockFetchShippingEstimate.mockResolvedValue({ success: true, options: [makeWixOption()] });

      const { rerender } = renderHook(({ id }) => useShippingEstimate(id), {
        initialProps: { id: 'prod-foo' },
      });
      await waitFor(() => expect(mockFetchShippingEstimate).toHaveBeenCalledTimes(1));

      rerender({ id: 'prod-bar' });
      await waitFor(() => expect(mockFetchShippingEstimate).toHaveBeenCalledTimes(2));
    });
  });

  describe('zipOverride parameter', () => {
    it('uses zipOverride instead of defaultAddress when provided', async () => {
      mockUseOptionalWixClient.mockReturnValue({
        fetchShippingEstimate: mockFetchShippingEstimate,
      } as any);
      mockUseAddressBook.mockReturnValue({ defaultAddress: { zip: '28801' } });
      mockFetchShippingEstimate.mockResolvedValue({ success: true, options: [makeWixOption()] });

      renderHook(() => useShippingEstimate(PRODUCT_ID, '90210'));
      await waitFor(() =>
        expect(mockFetchShippingEstimate).toHaveBeenCalledWith('90210', expect.any(Array)),
      );
    });

    it('ignores empty string zipOverride and falls back to defaultAddress', async () => {
      mockUseAddressBook.mockReturnValue({ defaultAddress: { zip: '10001' } });

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID, ''));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // 10001 (NY) prefix ~100 → 5–7 business days
      expect(result.current.label).toBe('5–7 business days');
    });

    it('ignores whitespace-only zipOverride', async () => {
      mockUseAddressBook.mockReturnValue({ defaultAddress: { zip: '10001' } });

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID, '   '));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.label).toBe('5–7 business days');
    });

    it('persists zipOverride to AsyncStorage when non-empty', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.setItem.mockClear();
      mockUseOptionalWixClient.mockReturnValue({
        fetchShippingEstimate: mockFetchShippingEstimate,
      } as any);
      mockFetchShippingEstimate.mockResolvedValue({ success: true, options: [makeWixOption()] });

      renderHook(() => useShippingEstimate(PRODUCT_ID, '90210'));

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('@shipping_estimate_zip', '90210');
      });
    });

    it('does not persist to AsyncStorage when zipOverride is undefined', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.setItem.mockClear();

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('does not persist to AsyncStorage when zipOverride is empty', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.setItem.mockClear();

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID, ''));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('re-fetches when zipOverride changes', async () => {
      mockUseOptionalWixClient.mockReturnValue({
        fetchShippingEstimate: mockFetchShippingEstimate,
      } as any);
      mockFetchShippingEstimate.mockResolvedValue({ success: true, options: [makeWixOption()] });

      const { rerender } = renderHook(({ zip }) => useShippingEstimate(PRODUCT_ID, zip), {
        initialProps: { zip: '28801' },
      });
      await waitFor(() => expect(mockFetchShippingEstimate).toHaveBeenCalledTimes(1));

      rerender({ zip: '90210' });
      await waitFor(() => expect(mockFetchShippingEstimate).toHaveBeenCalledTimes(2));
      expect(mockFetchShippingEstimate).toHaveBeenLastCalledWith('90210', expect.any(Array));
    });
  });

  describe('isEstimate flag', () => {
    it('returns isEstimate:false when live API returns options', async () => {
      mockUseOptionalWixClient.mockReturnValue({
        fetchShippingEstimate: mockFetchShippingEstimate,
      } as any);
      mockFetchShippingEstimate.mockResolvedValue({ success: true, options: [makeWixOption()] });

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isEstimate).toBe(false);
    });

    it('returns isEstimate:true when using local fallback (no wixClient)', async () => {
      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isEstimate).toBe(true);
    });

    it('returns isEstimate:true when API throws', async () => {
      mockUseOptionalWixClient.mockReturnValue({
        fetchShippingEstimate: mockFetchShippingEstimate,
      } as any);
      mockFetchShippingEstimate.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isEstimate).toBe(true);
    });

    it('returns isEstimate:true when API returns empty options', async () => {
      mockUseOptionalWixClient.mockReturnValue({
        fetchShippingEstimate: mockFetchShippingEstimate,
      } as any);
      mockFetchShippingEstimate.mockResolvedValue({ success: true, options: [] });

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isEstimate).toBe(true);
    });

    it('returns isEstimate:true when API returns success:false', async () => {
      mockUseOptionalWixClient.mockReturnValue({
        fetchShippingEstimate: mockFetchShippingEstimate,
      } as any);
      mockFetchShippingEstimate.mockResolvedValue({ success: false, options: [] });

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isEstimate).toBe(true);
    });
  });

  describe('options array', () => {
    it('returns empty options when using local fallback', async () => {
      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.options).toEqual([]);
    });

    it('returns all API options when live API responds with multiple', async () => {
      mockUseOptionalWixClient.mockReturnValue({
        fetchShippingEstimate: mockFetchShippingEstimate,
      } as any);
      mockFetchShippingEstimate.mockResolvedValue({
        success: true,
        options: [
          makeWixOption({ icon: '📦', deliveryTime: '5–7 business days' }),
          makeWixOption({
            icon: '🚀',
            deliveryTime: '2–3 business days',
            badge: 'Express',
            badgeStyle: 'premium',
          }),
        ],
      });

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.options).toHaveLength(2);
      expect(result.current.options[0]).toMatchObject({
        icon: '📦',
        deliveryTime: '5–7 business days',
      });
      expect(result.current.options[1]).toMatchObject({
        icon: '🚀',
        badge: 'Express',
        badgeStyle: 'premium',
      });
    });

    it('normalizes option shape with required fields', async () => {
      mockUseOptionalWixClient.mockReturnValue({
        fetchShippingEstimate: mockFetchShippingEstimate,
      } as any);
      mockFetchShippingEstimate.mockResolvedValue({
        success: true,
        options: [makeWixOption()],
      });

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.options[0]).toMatchObject({
        code: expect.any(String),
        title: expect.any(String),
        price: expect.any(String),
        currency: expect.any(String),
        deliveryTime: expect.any(String),
        icon: expect.any(String),
      });
    });

    it('returns empty options after API fallback (API returns empty)', async () => {
      mockUseOptionalWixClient.mockReturnValue({
        fetchShippingEstimate: mockFetchShippingEstimate,
      } as any);
      mockFetchShippingEstimate.mockResolvedValue({ success: true, options: [] });

      const { result } = renderHook(() => useShippingEstimate(PRODUCT_ID));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.options).toEqual([]);
    });

    it('returns empty options when productId is empty', async () => {
      const { result } = renderHook(() => useShippingEstimate(''));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.options).toEqual([]);
    });
  });
});
