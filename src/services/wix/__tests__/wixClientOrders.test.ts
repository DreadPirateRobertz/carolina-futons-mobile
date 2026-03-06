import { WixClient, WixApiError } from '../wixClient';

const mockConfig = { apiKey: 'test-key', siteId: 'test-site', baseUrl: 'https://test.wixapis.com' };

function createClient() {
  return new WixClient(mockConfig);
}

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('WixClient.queryOrders', () => {
  const mockWixOrder = {
    id: 'order-1',
    number: '2026-0001',
    status: 'APPROVED',
    lineItems: [
      {
        id: 'li-1',
        productName: { original: 'The Asheville' },
        catalogReference: { catalogItemId: 'prod-asheville-full' },
        quantity: 1,
        price: { amount: '349.00' },
        totalPrice: { amount: '349.00' },
        descriptionLines: [
          { name: { original: 'Fabric' }, plainText: { original: 'Mountain Blue' } },
        ],
      },
    ],
    priceSummary: {
      subtotal: { amount: '349.00' },
      shipping: { amount: '0.00' },
      tax: { amount: '24.43' },
      total: { amount: '373.43' },
    },
    shippingInfo: {
      logistics: {
        shippingDestination: {
          address: {
            addressLine1: '123 Main St',
            city: 'Asheville',
            subdivision: 'NC',
            postalCode: '28801',
          },
          contactDetails: { firstName: 'Jane', lastName: 'Smith' },
        },
      },
    },
    createdDate: '2026-02-10T14:30:00Z',
    updatedDate: '2026-02-10T14:30:00Z',
    paymentStatus: 'PAID',
  };

  it('fetches and transforms orders', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        orders: [mockWixOrder],
        pagingMetadata: { total: 1 },
      }),
    });

    const client = createClient();
    const result = await client.queryOrders();

    expect(result.totalResults).toBe(1);
    expect(result.orders).toHaveLength(1);

    const order = result.orders[0];
    expect(order.id).toBe('order-1');
    expect(order.orderNumber).toBe('CF-2026-0001');
    expect(order.status).toBe('processing');
    expect(order.items).toHaveLength(1);
    expect(order.items[0].modelName).toBe('The Asheville');
    expect(order.items[0].fabricName).toBe('Mountain Blue');
    expect(order.subtotal).toBe(349);
    expect(order.total).toBe(373.43);
    expect(order.shippingAddress.name).toBe('Jane Smith');
    expect(order.shippingAddress.city).toBe('Asheville');
    expect(order.paymentMethod).toBe('Paid');
  });

  it('maps FULFILLED status to delivered', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        orders: [{ ...mockWixOrder, status: 'FULFILLED' }],
        pagingMetadata: { total: 1 },
      }),
    });

    const result = await createClient().queryOrders();
    expect(result.orders[0].status).toBe('delivered');
  });

  it('maps CANCELED status to cancelled', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        orders: [{ ...mockWixOrder, status: 'CANCELED' }],
        pagingMetadata: { total: 1 },
      }),
    });

    const result = await createClient().queryOrders();
    expect(result.orders[0].status).toBe('cancelled');
  });

  it('handles fulfillment tracking info', async () => {
    const orderWithTracking = {
      ...mockWixOrder,
      status: 'FULFILLED',
      fulfillments: [
        {
          id: 'ful-1',
          trackingInfo: {
            trackingNumber: '1Z999AA1',
            shippingProvider: 'UPS',
            trackingLink: 'https://ups.com/track/1Z999AA1',
          },
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        orders: [orderWithTracking],
        pagingMetadata: { total: 1 },
      }),
    });

    const result = await createClient().queryOrders();
    expect(result.orders[0].tracking).toBeDefined();
    expect(result.orders[0].tracking!.carrier).toBe('UPS');
    expect(result.orders[0].tracking!.trackingNumber).toBe('1Z999AA1');
  });

  it('handles empty orders response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ orders: [], pagingMetadata: { total: 0 } }),
    });

    const result = await createClient().queryOrders();
    expect(result.orders).toEqual([]);
    expect(result.totalResults).toBe(0);
  });

  it('throws WixApiError on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    });

    await expect(createClient().queryOrders()).rejects.toThrow(WixApiError);
  });

  it('handles missing shipping info gracefully', async () => {
    const orderNoShipping = { ...mockWixOrder, shippingInfo: undefined };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        orders: [orderNoShipping],
        pagingMetadata: { total: 1 },
      }),
    });

    const result = await createClient().queryOrders();
    expect(result.orders[0].shippingAddress.name).toBe('N/A');
  });
});

describe('WixClient.getOrder', () => {
  it('throws on empty ID', async () => {
    await expect(createClient().getOrder('')).rejects.toThrow('Order ID is required');
  });

  it('fetches a single order', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        order: {
          id: 'order-1',
          number: '123',
          status: 'APPROVED',
          lineItems: [],
          priceSummary: {
            subtotal: { amount: '0' },
            shipping: { amount: '0' },
            tax: { amount: '0' },
            total: { amount: '0' },
          },
          createdDate: '2026-01-01T00:00:00Z',
          updatedDate: '2026-01-01T00:00:00Z',
        },
      }),
    });

    const order = await createClient().getOrder('order-1');
    expect(order).not.toBeNull();
    expect(order!.id).toBe('order-1');
  });
});
