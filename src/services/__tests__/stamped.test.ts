/**
 * @module stamped.test
 *
 * Tests for Stamped.io reviews REST API client.
 * Covers: happy path, API errors, empty reviews, pagination, missing env vars,
 * malformed responses, and rating clamping.
 *
 * hq-tcdpe
 */

import { fetchStampedReviews, fetchStampedRatingSummary } from '../stamped';
import type { Review } from '@/data/reviews';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_STAMPED_API_KEY = 'test-api-key';
  process.env.EXPO_PUBLIC_STAMPED_STORE_HASH = 'test-store-hash';
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_STAMPED_API_KEY;
  delete process.env.EXPO_PUBLIC_STAMPED_STORE_HASH;
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeStampedReview(overrides: Record<string, unknown> = {}) {
  return {
    id: 12345,
    productId: 'asheville-full',
    author: 'Sarah M.',
    reviewRating: 5,
    reviewTitle: 'Best futon I have ever owned',
    reviewMessage: 'Incredibly comfortable.',
    reviewDate: '2026-02-10T14:22:00.000Z',
    reviewVotesUp: 18,
    reviewVerifiedType: 'verified-purchase',
    reviewUserPhotos: ['https://cdn.stamped.io/photo1.jpg'],
    ...overrides,
  };
}

function makeStampedRatingSummary(overrides: Record<string, unknown> = {}) {
  return {
    rating: 4.6,
    count: 42,
    countPerRating: { '1': 1, '2': 2, '3': 3, '4': 8, '5': 28 },
    ...overrides,
  };
}

// ── fetchStampedReviews ──────────────────────────────────────────────────────

describe('fetchStampedReviews', () => {
  it('fetches reviews for a product and maps to Review shape', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [makeStampedReview()],
        total: 1,
      }),
    });

    const result = await fetchStampedReviews('asheville-full');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('productId=asheville-full');
    expect(url).toContain('apiKey=test-api-key');
    expect(url).toContain('storeUrl=test-store-hash');

    expect(result.reviews).toHaveLength(1);
    expect(result.total).toBe(1);

    const review: Review = result.reviews[0];
    expect(review.id).toBe('12345');
    expect(review.productId).toBe('asheville-full');
    expect(review.authorName).toBe('Sarah M.');
    expect(review.rating).toBe(5);
    expect(review.title).toBe('Best futon I have ever owned');
    expect(review.body).toBe('Incredibly comfortable.');
    expect(review.helpful).toBe(18);
    expect(review.verified).toBe(true);
    expect(review.photos).toEqual(['https://cdn.stamped.io/photo1.jpg']);
  });

  it('passes pagination params (page, perPage)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], total: 0 }),
    });

    await fetchStampedReviews('test-product', { page: 2, perPage: 5 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('page=2');
    expect(url).toContain('perPage=5');
  });

  it('returns empty array when no reviews exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], total: 0 }),
    });

    const result = await fetchStampedReviews('no-reviews-product');
    expect(result.reviews).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('throws on API error (non-ok response)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(fetchStampedReviews('test')).rejects.toThrow(
      'Stamped.io API error: 500 Internal Server Error',
    );
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network request failed'));

    await expect(fetchStampedReviews('test')).rejects.toThrow('Network request failed');
  });

  it('throws when API key is not configured', async () => {
    delete process.env.EXPO_PUBLIC_STAMPED_API_KEY;

    await expect(fetchStampedReviews('test')).rejects.toThrow(
      'Stamped.io API key not configured',
    );
  });

  it('throws when store hash is not configured', async () => {
    delete process.env.EXPO_PUBLIC_STAMPED_STORE_HASH;

    await expect(fetchStampedReviews('test')).rejects.toThrow(
      'Stamped.io store hash not configured',
    );
  });

  it('clamps ratings to 1-5 range', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          makeStampedReview({ reviewRating: 0 }),
          makeStampedReview({ id: 2, reviewRating: 7 }),
          makeStampedReview({ id: 3, reviewRating: -1 }),
        ],
        total: 3,
      }),
    });

    const result = await fetchStampedReviews('test');
    expect(result.reviews[0].rating).toBe(1);
    expect(result.reviews[1].rating).toBe(5);
    expect(result.reviews[2].rating).toBe(1);
  });

  it('handles malformed review data gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ id: 99 }], // minimal data — most fields missing
        total: 1,
      }),
    });

    const result = await fetchStampedReviews('test');
    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0].authorName).toBe('');
    expect(result.reviews[0].body).toBe('');
    expect(result.reviews[0].rating).toBe(1); // clamped from 0
  });

  it('marks unverified reviews correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [makeStampedReview({ reviewVerifiedType: '' })],
        total: 1,
      }),
    });

    const result = await fetchStampedReviews('test');
    expect(result.reviews[0].verified).toBe(false);
  });

  it('defaults page to 1 and perPage to 10', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], total: 0 }),
    });

    await fetchStampedReviews('test');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('page=1');
    expect(url).toContain('perPage=10');
  });
});

// ── fetchStampedRatingSummary ────────────────────────────────────────────────

describe('fetchStampedRatingSummary', () => {
  it('fetches rating summary for a product', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeStampedRatingSummary(),
    });

    const result = await fetchStampedRatingSummary('asheville-full');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('productId=asheville-full');

    expect(result.averageRating).toBe(4.6);
    expect(result.totalReviews).toBe(42);
    expect(result.distribution).toEqual([1, 2, 3, 8, 28]);
  });

  it('returns zeros when product has no reviews', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        rating: 0,
        count: 0,
        countPerRating: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      }),
    });

    const result = await fetchStampedRatingSummary('no-reviews');
    expect(result.averageRating).toBe(0);
    expect(result.totalReviews).toBe(0);
    expect(result.distribution).toEqual([0, 0, 0, 0, 0]);
  });

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(fetchStampedRatingSummary('test')).rejects.toThrow(
      'Stamped.io API error: 401 Unauthorized',
    );
  });
});
