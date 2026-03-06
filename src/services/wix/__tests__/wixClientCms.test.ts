import { WixClient, WixApiError } from '../wixClient';

const mockConfig = { apiKey: 'test-key', siteId: 'test-site', baseUrl: 'https://test.wixapis.com' };

function createClient() {
  return new WixClient(mockConfig);
}

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('WixClient.queryReviews', () => {
  it('throws on empty product ID', async () => {
    await expect(createClient().queryReviews('')).rejects.toThrow('Product ID is required');
  });

  it('fetches and transforms CMS reviews', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        dataItems: [
          {
            data: {
              _id: 'rev-1',
              productId: 'prod-1',
              authorName: 'Alice',
              rating: 5,
              title: 'Great',
              body: 'Loved it',
              createdAt: '2026-01-01T00:00:00Z',
              helpful: 3,
              verified: true,
              photos: ['https://example.com/photo.jpg'],
            },
          },
        ],
        pagingMetadata: { total: 1 },
      }),
    });

    const result = await createClient().queryReviews('prod-1');
    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0].authorName).toBe('Alice');
    expect(result.reviews[0].rating).toBe(5);
    expect(result.reviews[0].photos).toEqual(['https://example.com/photo.jpg']);
    expect(result.totalResults).toBe(1);
  });

  it('handles empty reviews', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ dataItems: [], pagingMetadata: { total: 0 } }),
    });

    const result = await createClient().queryReviews('prod-1');
    expect(result.reviews).toEqual([]);
  });

  it('handles missing optional fields', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        dataItems: [
          {
            data: {
              _id: 'rev-2',
              productId: 'prod-1',
            },
          },
        ],
        pagingMetadata: { total: 1 },
      }),
    });

    const result = await createClient().queryReviews('prod-1');
    expect(result.reviews[0].authorName).toBe('Anonymous');
    expect(result.reviews[0].rating).toBe(5);
    expect(result.reviews[0].title).toBe('');
    expect(result.reviews[0].photos).toBeUndefined();
  });
});

describe('WixClient.getReviewSummary', () => {
  it('computes summary from reviews', async () => {
    const reviews = [
      { _id: 'r1', rating: 5, authorName: 'A', title: '', body: '', createdAt: '', helpful: 0, verified: true },
      { _id: 'r2', rating: 4, authorName: 'B', title: '', body: '', createdAt: '', helpful: 0, verified: true },
      { _id: 'r3', rating: 5, authorName: 'C', title: '', body: '', createdAt: '', helpful: 0, verified: false },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        dataItems: reviews.map((r) => ({ data: r })),
        pagingMetadata: { total: reviews.length },
      }),
    });

    const summary = await createClient().getReviewSummary('prod-1');
    expect(summary.totalReviews).toBe(3);
    expect(summary.averageRating).toBe(4.7);
    expect(summary.distribution[4]).toBe(2); // 5-star count
    expect(summary.distribution[3]).toBe(1); // 4-star count
    expect(summary.distribution[0]).toBe(0); // 1-star count
  });

  it('returns zero summary for no reviews', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ dataItems: [], pagingMetadata: { total: 0 } }),
    });

    const summary = await createClient().getReviewSummary('prod-1');
    expect(summary.totalReviews).toBe(0);
    expect(summary.averageRating).toBe(0);
  });
});

describe('WixClient.queryStores', () => {
  it('fetches and transforms CMS store data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        dataItems: [
          {
            data: {
              _id: 'store-1',
              name: 'Test Store',
              address: '123 Main St',
              city: 'Asheville',
              state: 'NC',
              zip: '28801',
              phone: '8285550100',
              email: 'test@example.com',
              latitude: 35.5946,
              longitude: -82.554,
              hours: [{ day: 'Monday', open: '10:00', close: '18:00' }],
              photos: ['https://example.com/photo.jpg'],
              features: ['Full showroom'],
              description: 'A test store',
            },
          },
        ],
        pagingMetadata: { total: 1 },
      }),
    });

    const result = await createClient().queryStores();
    expect(result.stores).toHaveLength(1);
    expect(result.stores[0].name).toBe('Test Store');
    expect(result.stores[0].city).toBe('Asheville');
    expect(result.stores[0].hours).toHaveLength(1);
    expect(result.totalResults).toBe(1);
  });

  it('handles missing optional fields', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        dataItems: [{ data: { _id: 'store-2' } }],
        pagingMetadata: { total: 1 },
      }),
    });

    const result = await createClient().queryStores();
    const store = result.stores[0];
    expect(store.id).toBe('store-2');
    expect(store.name).toBe('');
    expect(store.hours).toEqual([]);
    expect(store.photos).toEqual([]);
  });

  it('handles empty response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ dataItems: [], pagingMetadata: { total: 0 } }),
    });

    const result = await createClient().queryStores();
    expect(result.stores).toEqual([]);
  });
});
