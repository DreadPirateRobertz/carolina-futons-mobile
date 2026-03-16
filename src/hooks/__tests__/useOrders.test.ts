import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOrders, transformWixOrder } from '../useOrders';
import { MOCK_ORDERS } from '@/data/orders';
import { ORDER_CACHE_KEY } from '@/services/orderCache';
import type { WixOrderResponse } from '@/services/wix/wixClient';

// Mock wixProvider — default returns null (no client)
const mockQueryOrders = jest.fn();
const mockUseOptionalWixClient = jest.fn(() => null);
jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

/** Helper: build a minimal WixOrderResponse for testing */
function makeWixOrder(overrides: Partial<WixOrderResponse> = {}): WixOrderResponse {
  return {
    _id: 'wix-ord-001',
    number: '5001',
    status: 'APPROVED',
    _createdDate: '2026-03-01T10:00:00Z',
    _updatedDate: '2026-03-02T10:00:00Z',
    lineItems: [
      {
        _id: 'li-wix-1',
        catalogReference: { catalogItemId: 'asheville-full', appId: 'app1' },
        productName: { translated: 'The Asheville' },
        quantity: 1,
        price: { amount: '499.00' },
        totalPrice: { amount: '499.00' },
      },
    ],
    priceSummary: {
      subtotal: { amount: '499.00' },
      shipping: { amount: '49.00' },
      tax: { amount: '39.92' },
      total: { amount: '587.92' },
    },
    billingInfo: { paymentMethod: 'Visa ····4242' },
    paymentStatus: 'PAID',
    ...overrides,
  };
}

describe('useOrders', () => {
  const sortedOrders = [...MOCK_ORDERS].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockUseOptionalWixClient.mockReturnValue(null);
  });

  // --- List all orders ---

  it('returns all mock orders sorted by date descending', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.orders).toEqual(sortedOrders);
  });

  it('returns isLoading=false after hydration', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('returns error=null on success', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
  });

  // --- Single order by ID ---

  it('getOrder returns an order by ID', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const order = result.current.getOrder(MOCK_ORDERS[0].id);
    expect(order).toEqual(MOCK_ORDERS[0]);
  });

  it('getOrder returns undefined for unknown ID', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const order = result.current.getOrder('nonexistent-order');
    expect(order).toBeUndefined();
  });

  // --- Filter by status ---

  it('filters orders by status', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      result.current.setStatusFilter('delivered');
    });
    expect(result.current.orders.every((o) => o.status === 'delivered')).toBe(true);
    expect(result.current.orders.length).toBeGreaterThan(0);
  });

  it('returns all orders when status filter is null', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      result.current.setStatusFilter('delivered');
    });
    act(() => {
      result.current.setStatusFilter(null);
    });
    expect(result.current.orders).toEqual(sortedOrders);
  });

  it('returns empty array when no orders match filter', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      result.current.setStatusFilter('cancelled');
    });
    const cancelledCount = MOCK_ORDERS.filter((o) => o.status === 'cancelled').length;
    expect(result.current.orders.length).toBe(cancelledCount);
  });

  // --- Refresh ---

  it('returns a refresh function', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refresh).toBe('function');
  });

  it('refresh does not throw', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(() => result.current.refresh()).not.toThrow();
  });

  // --- Edge cases ---

  it('orders are sorted by createdAt descending (most recent first)', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const dates = result.current.orders.map((o) => new Date(o.createdAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  it('getOrder works after setting a status filter', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      result.current.setStatusFilter('delivered');
    });
    // getOrder should still find any order by ID regardless of filter
    const order = result.current.getOrder(MOCK_ORDERS[0].id);
    expect(order).toEqual(MOCK_ORDERS[0]);
  });

  // --- Boundary conditions ---

  it('every order has required fields', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    for (const order of result.current.orders) {
      expect(order.id).toBeDefined();
      expect(order.orderNumber).toBeDefined();
      expect(order.status).toBeDefined();
      expect(order.createdAt).toBeDefined();
      expect(order.items.length).toBeGreaterThan(0);
      expect(typeof order.total).toBe('number');
      expect(order.shippingAddress).toBeDefined();
      expect(order.paymentMethod).toBeDefined();
    }
  });

  it('cycles through all status filters without error', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const statuses: ('processing' | 'shipped' | 'delivered' | 'cancelled')[] = [
      'processing',
      'shipped',
      'delivered',
      'cancelled',
    ];
    for (const status of statuses) {
      act(() => {
        result.current.setStatusFilter(status);
      });
      expect(result.current.orders.every((o) => o.status === status)).toBe(true);
    }
  });

  it('getOrder with empty string returns undefined', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.getOrder('')).toBeUndefined();
  });

  it('statusFilter state is null initially', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.statusFilter).toBeNull();
  });

  it('order line items have valid price data', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    for (const order of result.current.orders) {
      for (const item of order.items) {
        expect(item.unitPrice).toBeGreaterThan(0);
        expect(item.quantity).toBeGreaterThan(0);
        expect(item.lineTotal).toBe(item.unitPrice * item.quantity);
      }
    }
  });

  // --- Cache integration ---

  it('caches orders to AsyncStorage after hydration', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockSetItem).toHaveBeenCalledWith(ORDER_CACHE_KEY, expect.any(String));
    const stored = JSON.parse(mockSetItem.mock.calls[0][1]);
    expect(stored.orders).toHaveLength(MOCK_ORDERS.length);
  });

  it('loads cached orders when cache exists', async () => {
    const cachedOrders = [MOCK_ORDERS[0]];
    mockGetItem.mockResolvedValue(
      JSON.stringify({ orders: cachedOrders, cachedAt: new Date().toISOString() }),
    );
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // After hydration completes, fresh data replaces cached
    expect(result.current.orders).toEqual(sortedOrders);
  });

  it('serves cached orders when cache is available before fresh load', async () => {
    const cachedOrders = [MOCK_ORDERS[0]];
    // Simulate slow fresh load by checking intermediate state
    mockGetItem.mockResolvedValue(
      JSON.stringify({ orders: cachedOrders, cachedAt: new Date().toISOString() }),
    );
    const { result } = renderHook(() => useOrders());
    // Eventually resolves to full set
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.orders.length).toBe(MOCK_ORDERS.length);
  });

  it('refresh re-caches orders', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockSetItem.mockClear();
    act(() => {
      result.current.refresh();
    });
    // refresh is async — wait for cacheOrders to be called
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith(ORDER_CACHE_KEY, expect.any(String));
    });
  });

  // --- Cache error handling ---

  it('continues to fresh data when cache load throws', async () => {
    mockGetItem.mockRejectedValue(new Error('AsyncStorage read failure'));
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Should still have mock orders despite cache failure
    expect(result.current.orders).toEqual(sortedOrders);
    expect(result.current.error).toBeNull();
  });

  it('handles cache with empty orders array (does not replace state)', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({ orders: [], cachedAt: new Date().toISOString() }),
    );
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Empty cached array should be ignored (length === 0 guard); fresh data used
    expect(result.current.orders).toEqual(sortedOrders);
  });

  it('handles malformed cache JSON gracefully', async () => {
    mockGetItem.mockResolvedValue('not-valid-json{{{');
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.orders).toEqual(sortedOrders);
    expect(result.current.error).toBeNull();
  });

  it('handles cache write failure silently', async () => {
    mockSetItem.mockRejectedValue(new Error('AsyncStorage write failure'));
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Hook should still work even if caching fails
    expect(result.current.orders).toEqual(sortedOrders);
    expect(result.current.error).toBeNull();
  });

  // --- Wix API integration path ---

  it('fetches orders from Wix client when available', async () => {
    const wixOrder = makeWixOrder();
    mockQueryOrders.mockResolvedValue({ orders: [wixOrder], totalResults: 1 });
    mockUseOptionalWixClient.mockReturnValue({ queryOrders: mockQueryOrders });

    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockQueryOrders).toHaveBeenCalledWith({ limit: 100 });
    expect(result.current.orders).toHaveLength(1);
    expect(result.current.orders[0].id).toBe('wix-ord-001');
    expect(result.current.orders[0].orderNumber).toBe('CF-5001');
    expect(result.current.error).toBeNull();
  });

  it('sets error when Wix API call fails', async () => {
    mockQueryOrders.mockRejectedValue(new Error('Network timeout'));
    mockUseOptionalWixClient.mockReturnValue({ queryOrders: mockQueryOrders });

    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe('Network timeout');
  });

  it('wraps non-Error API failures in Error', async () => {
    mockQueryOrders.mockRejectedValue('string error from API');
    mockUseOptionalWixClient.mockReturnValue({ queryOrders: mockQueryOrders });

    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe('string error from API');
  });

  it('caches Wix orders after successful API fetch', async () => {
    const wixOrder = makeWixOrder();
    mockQueryOrders.mockResolvedValue({ orders: [wixOrder], totalResults: 1 });
    mockUseOptionalWixClient.mockReturnValue({ queryOrders: mockQueryOrders });

    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockSetItem).toHaveBeenCalledWith(ORDER_CACHE_KEY, expect.any(String));
    const stored = JSON.parse(mockSetItem.mock.calls[0][1]);
    expect(stored.orders[0].id).toBe('wix-ord-001');
  });

  it('refresh clears error and re-fetches from Wix', async () => {
    // First load fails
    mockQueryOrders.mockRejectedValueOnce(new Error('First failure'));
    mockUseOptionalWixClient.mockReturnValue({ queryOrders: mockQueryOrders });

    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).not.toBeNull();

    // Now fix the API
    mockQueryOrders.mockResolvedValue({
      orders: [makeWixOrder()],
      totalResults: 1,
    });

    act(() => {
      result.current.refresh();
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.orders).toHaveLength(1);
  });

  it('refresh sets isLoading true while re-fetching', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.refresh();
    });
    // Immediately after refresh, isLoading should be true
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('does not update state after unmount (cancelled flag)', async () => {
    // Use a deferred promise to control when the API resolves
    let resolveQuery!: (v: { orders: WixOrderResponse[]; totalResults: number }) => void;
    mockQueryOrders.mockReturnValue(
      new Promise((r) => {
        resolveQuery = r;
      }),
    );
    mockUseOptionalWixClient.mockReturnValue({ queryOrders: mockQueryOrders });

    const { result, unmount } = renderHook(() => useOrders());

    // Unmount before the API resolves
    unmount();

    // Resolve after unmount — should not throw or update state
    resolveQuery({ orders: [makeWixOrder()], totalResults: 1 });

    // If we got here without errors, the cancelled flag worked
    expect(result.current.isLoading).toBe(true); // never transitioned to false
  });

  // --- transformWixOrder unit tests ---

  describe('transformWixOrder', () => {
    it('maps APPROVED status to processing', () => {
      const order = transformWixOrder(makeWixOrder({ status: 'APPROVED' }));
      expect(order.status).toBe('processing');
    });

    it('maps INITIALIZED status to processing', () => {
      const order = transformWixOrder(makeWixOrder({ status: 'INITIALIZED' }));
      expect(order.status).toBe('processing');
    });

    it('maps FULFILLED status to delivered', () => {
      const order = transformWixOrder(makeWixOrder({ status: 'FULFILLED' }));
      expect(order.status).toBe('delivered');
    });

    it('maps CANCELED status to cancelled', () => {
      const order = transformWixOrder(makeWixOrder({ status: 'CANCELED' }));
      expect(order.status).toBe('cancelled');
    });

    it('maps unknown status to processing (default)', () => {
      const order = transformWixOrder(makeWixOrder({ status: 'SOMETHING_ELSE' }));
      expect(order.status).toBe('processing');
    });

    it('handles case-insensitive status mapping', () => {
      const order = transformWixOrder(makeWixOrder({ status: 'fulfilled' }));
      expect(order.status).toBe('delivered');
    });

    it('constructs orderNumber with CF- prefix', () => {
      const order = transformWixOrder(makeWixOrder({ number: '9999' }));
      expect(order.orderNumber).toBe('CF-9999');
    });

    it('parses price summary amounts from strings', () => {
      const order = transformWixOrder(
        makeWixOrder({
          priceSummary: {
            subtotal: { amount: '100.50' },
            shipping: { amount: '10.00' },
            tax: { amount: '8.04' },
            total: { amount: '118.54' },
          },
        }),
      );
      expect(order.subtotal).toBe(100.5);
      expect(order.shipping).toBe(10);
      expect(order.tax).toBe(8.04);
      expect(order.total).toBe(118.54);
    });

    it('defaults price to 0 when amount is missing', () => {
      const wix = makeWixOrder();
      // Remove priceSummary to test fallback
      (wix as Record<string, unknown>).priceSummary = undefined;
      const order = transformWixOrder(wix);
      expect(order.subtotal).toBe(0);
      expect(order.shipping).toBe(0);
      expect(order.tax).toBe(0);
      expect(order.total).toBe(0);
    });

    it('maps line item fields correctly', () => {
      const order = transformWixOrder(makeWixOrder());
      expect(order.items).toHaveLength(1);
      const item = order.items[0];
      expect(item.id).toBe('li-wix-1');
      expect(item.modelName).toBe('The Asheville');
      expect(item.quantity).toBe(1);
      expect(item.unitPrice).toBe(499);
      expect(item.lineTotal).toBe(499);
    });

    it('defaults line item price to 0 when price is missing', () => {
      const wix = makeWixOrder();
      (wix.lineItems[0] as Record<string, unknown>).price = undefined;
      (wix.lineItems[0] as Record<string, unknown>).totalPrice = undefined;
      const order = transformWixOrder(wix);
      expect(order.items[0].unitPrice).toBe(0);
      expect(order.items[0].lineTotal).toBe(0);
    });

    it('defaults productName to empty string when translated is missing', () => {
      const wix = makeWixOrder();
      (wix.lineItems[0] as Record<string, unknown>).productName = undefined;
      const order = transformWixOrder(wix);
      expect(order.items[0].modelName).toBe('');
    });

    it('handles order with no shippingInfo (undefined)', () => {
      const order = transformWixOrder(makeWixOrder({ shippingInfo: undefined }));
      expect(order.shippingAddress.name).toBe('');
      expect(order.shippingAddress.street).toBe('');
      expect(order.shippingAddress.city).toBe('');
      expect(order.tracking).toBeUndefined();
    });

    it('handles shippingInfo with no logistics', () => {
      const order = transformWixOrder(makeWixOrder({ shippingInfo: { logistics: undefined } }));
      expect(order.shippingAddress.name).toBe('');
      expect(order.tracking).toBeUndefined();
    });

    it('handles shippingInfo with logistics but no destination', () => {
      const order = transformWixOrder(
        makeWixOrder({
          shippingInfo: { logistics: { shippingDestination: undefined } },
        }),
      );
      expect(order.shippingAddress.name).toBe('');
      expect(order.shippingAddress.street).toBe('');
    });

    it('extracts shipping address from destination', () => {
      const order = transformWixOrder(
        makeWixOrder({
          shippingInfo: {
            logistics: {
              shippingDestination: {
                contactDetails: { firstName: 'John', lastName: 'Doe' },
                address: {
                  addressLine1: '123 Main St',
                  city: 'Asheville',
                  subdivision: 'NC',
                  postalCode: '28801',
                },
              },
            },
          },
        }),
      );
      expect(order.shippingAddress.name).toBe('John Doe');
      expect(order.shippingAddress.street).toBe('123 Main St');
      expect(order.shippingAddress.city).toBe('Asheville');
      expect(order.shippingAddress.state).toBe('NC');
      expect(order.shippingAddress.zip).toBe('28801');
    });

    it('handles destination without contactDetails', () => {
      const order = transformWixOrder(
        makeWixOrder({
          shippingInfo: {
            logistics: {
              shippingDestination: {
                address: {
                  addressLine1: '123 Main St',
                  city: 'Asheville',
                  subdivision: 'NC',
                  postalCode: '28801',
                },
              },
            },
          },
        }),
      );
      expect(order.shippingAddress.name).toBe('');
    });

    it('handles destination without address', () => {
      const order = transformWixOrder(
        makeWixOrder({
          shippingInfo: {
            logistics: {
              shippingDestination: {
                contactDetails: { firstName: 'John', lastName: 'Doe' },
              },
            },
          },
        }),
      );
      expect(order.shippingAddress.street).toBe('');
      expect(order.shippingAddress.city).toBe('');
    });

    it('builds tracking info when trackingInfo is present', () => {
      const order = transformWixOrder(
        makeWixOrder({
          status: 'APPROVED',
          shippingInfo: {
            logistics: {
              trackingInfo: {
                trackingNumber: '1Z999AA10123456784',
                shippingProvider: 'UPS',
                trackingLink: 'https://custom-link.com/track',
              },
              deliveryTime: '2026-03-10',
            },
          },
        }),
      );
      expect(order.tracking).toBeDefined();
      expect(order.tracking!.carrier).toBe('UPS');
      expect(order.tracking!.trackingNumber).toBe('1Z999AA10123456784');
      // trackingLink is truthy, so it should use it instead of getTrackingUrl
      expect(order.tracking!.url).toBe('https://custom-link.com/track');
      expect(order.tracking!.estimatedDelivery).toBe('2026-03-10');
    });

    it('falls back to getTrackingUrl when trackingLink is empty', () => {
      const order = transformWixOrder(
        makeWixOrder({
          status: 'APPROVED',
          shippingInfo: {
            logistics: {
              trackingInfo: {
                trackingNumber: '1Z999AA10123456784',
                shippingProvider: 'UPS',
                trackingLink: '',
              },
            },
          },
        }),
      );
      expect(order.tracking!.url).toBe('https://www.ups.com/track?tracknum=1Z999AA10123456784');
    });

    it('promotes status to shipped when tracking exists and status is processing', () => {
      const order = transformWixOrder(
        makeWixOrder({
          status: 'APPROVED', // maps to 'processing'
          shippingInfo: {
            logistics: {
              trackingInfo: {
                trackingNumber: 'TRACK123',
                shippingProvider: 'FedEx',
                trackingLink: 'https://fedex.com/track',
              },
            },
          },
        }),
      );
      // tracking exists + status was 'processing' → promoted to 'shipped'
      expect(order.status).toBe('shipped');
    });

    it('does not promote status when tracking exists but status is delivered', () => {
      const order = transformWixOrder(
        makeWixOrder({
          status: 'FULFILLED', // maps to 'delivered'
          shippingInfo: {
            logistics: {
              trackingInfo: {
                trackingNumber: 'TRACK123',
                shippingProvider: 'FedEx',
                trackingLink: 'https://fedex.com/track',
              },
            },
          },
        }),
      );
      expect(order.status).toBe('delivered');
    });

    it('does not promote status when tracking exists but status is cancelled', () => {
      const order = transformWixOrder(
        makeWixOrder({
          status: 'CANCELED',
          shippingInfo: {
            logistics: {
              trackingInfo: {
                trackingNumber: 'TRACK123',
                shippingProvider: 'FedEx',
                trackingLink: 'https://fedex.com/track',
              },
            },
          },
        }),
      );
      expect(order.status).toBe('cancelled');
    });

    it('uses billingInfo.paymentMethod when present', () => {
      const order = transformWixOrder(
        makeWixOrder({ billingInfo: { paymentMethod: 'Mastercard ····5678' } }),
      );
      expect(order.paymentMethod).toBe('Mastercard ····5678');
    });

    it('defaults paymentMethod to empty string when billingInfo is missing', () => {
      const wix = makeWixOrder();
      (wix as Record<string, unknown>).billingInfo = undefined;
      const order = transformWixOrder(wix);
      expect(order.paymentMethod).toBe('');
    });

    it('handles multiple line items', () => {
      const wix = makeWixOrder();
      wix.lineItems.push({
        _id: 'li-wix-2',
        catalogReference: { catalogItemId: 'biltmore-queen', appId: 'app1' },
        productName: { translated: 'The Biltmore' },
        quantity: 2,
        price: { amount: '699.00' },
        totalPrice: { amount: '1398.00' },
      });
      const order = transformWixOrder(wix);
      expect(order.items).toHaveLength(2);
      expect(order.items[1].modelName).toBe('The Biltmore');
      expect(order.items[1].quantity).toBe(2);
      expect(order.items[1].lineTotal).toBe(1398);
    });
  });

  // --- Wix API with cached data ---

  it('serves cached orders first then replaces with Wix API data', async () => {
    const cachedOrder = { ...MOCK_ORDERS[0], id: 'cached-only' };
    mockGetItem.mockResolvedValue(
      JSON.stringify({ orders: [cachedOrder], cachedAt: new Date().toISOString() }),
    );

    const wixOrder = makeWixOrder();
    mockQueryOrders.mockResolvedValue({ orders: [wixOrder], totalResults: 1 });
    mockUseOptionalWixClient.mockReturnValue({ queryOrders: mockQueryOrders });

    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // After full hydration, Wix data replaces cached data
    expect(result.current.orders[0].id).toBe('wix-ord-001');
  });

  it('keeps cached/mock data visible when Wix API fails', async () => {
    const cachedOrders = [MOCK_ORDERS[0]];
    mockGetItem.mockResolvedValue(
      JSON.stringify({ orders: cachedOrders, cachedAt: new Date().toISOString() }),
    );
    mockQueryOrders.mockRejectedValue(new Error('Server error'));
    mockUseOptionalWixClient.mockReturnValue({ queryOrders: mockQueryOrders });

    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Error is set, but orders still show cached data
    expect(result.current.error).not.toBeNull();
    expect(result.current.orders.length).toBeGreaterThan(0);
  });

  it('handles Wix API returning empty orders array', async () => {
    mockQueryOrders.mockResolvedValue({ orders: [], totalResults: 0 });
    mockUseOptionalWixClient.mockReturnValue({ queryOrders: mockQueryOrders });

    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.orders).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });
});
