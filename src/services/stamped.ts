/**
 * @module stamped
 *
 * Stamped.io REST API client for product reviews and ratings.
 * Public API — uses store hash + API key (no secret required for read-only).
 *
 * Env vars:
 *   EXPO_PUBLIC_STAMPED_API_KEY   — public API key
 *   EXPO_PUBLIC_STAMPED_STORE_HASH — store identifier
 *
 * hq-tcdpe
 */

import type { Review, ReviewSummary } from '@/data/reviews';

const BASE_URL = 'https://stamped.io/api/v2';

/** Check whether Stamped.io env vars are present (avoids firing doomed requests). */
export function isStampedConfigured(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_STAMPED_API_KEY && process.env.EXPO_PUBLIC_STAMPED_STORE_HASH,
  );
}

const REQUEST_TIMEOUT_MS = 30_000;

function getConfig() {
  const apiKey = process.env.EXPO_PUBLIC_STAMPED_API_KEY;
  const storeHash = process.env.EXPO_PUBLIC_STAMPED_STORE_HASH;

  if (!apiKey) throw new Error('Stamped.io API key not configured');
  if (!storeHash) throw new Error('Stamped.io store hash not configured');

  return { apiKey, storeHash };
}

// ── Raw API response types ───────────────────────────────────────────────────

interface StampedRawReview {
  id?: number | string;
  productId?: string;
  author?: string;
  reviewRating?: number;
  reviewTitle?: string;
  reviewMessage?: string;
  reviewDate?: string;
  reviewVotesUp?: number;
  reviewVerifiedType?: string;
  reviewUserPhotos?: string[];
}

interface StampedReviewsResponse {
  data: StampedRawReview[];
  total: number;
}

interface StampedRatingSummaryResponse {
  rating: number;
  count: number;
  countPerRating: Record<string, number>;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function clampRating(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : 0;
  if (n <= 0) return 1;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function mapRawToReview(raw: StampedRawReview): Review {
  return {
    id: String(raw.id ?? ''),
    productId: String(raw.productId ?? ''),
    authorName: String(raw.author ?? ''),
    rating: clampRating(raw.reviewRating),
    title: String(raw.reviewTitle ?? ''),
    body: String(raw.reviewMessage ?? ''),
    createdAt: String(raw.reviewDate ?? new Date(0).toISOString()),
    helpful: typeof raw.reviewVotesUp === 'number' ? raw.reviewVotesUp : 0,
    verified: raw.reviewVerifiedType === 'verified-purchase',
    ...(Array.isArray(raw.reviewUserPhotos) && raw.reviewUserPhotos.length > 0
      ? { photos: raw.reviewUserPhotos.filter((p): p is string => typeof p === 'string') }
      : {}),
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface FetchReviewsResult {
  reviews: Review[];
  total: number;
}

export interface FetchReviewsOptions {
  page?: number;
  perPage?: number;
}

/**
 * Fetch product reviews from Stamped.io.
 *
 * @param productId - The product ID to fetch reviews for.
 * @param options   - Pagination options (page starts at 1, perPage defaults to 10).
 */
export async function fetchStampedReviews(
  productId: string,
  options: FetchReviewsOptions = {},
): Promise<FetchReviewsResult> {
  const { apiKey, storeHash } = getConfig();
  const page = options.page ?? 1;
  const perPage = options.perPage ?? 10;

  const params = new URLSearchParams({
    productId,
    apiKey,
    storeUrl: storeHash,
    page: String(page),
    perPage: String(perPage),
  });

  const response = await fetch(`${BASE_URL}/${storeHash}/reviews?${params}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Stamped.io API error: ${response.status} ${response.statusText}`);
  }

  const data: StampedReviewsResponse = await response.json();

  return {
    reviews: (data.data ?? []).map(mapRawToReview),
    total: data.total ?? 0,
  };
}

/**
 * Fetch rating summary (average + distribution) for a product from Stamped.io.
 *
 * @param productId - The product ID to fetch the summary for.
 */
export async function fetchStampedRatingSummary(productId: string): Promise<ReviewSummary> {
  const { apiKey, storeHash } = getConfig();

  const params = new URLSearchParams({
    productId,
    apiKey,
    storeUrl: storeHash,
  });

  const response = await fetch(`${BASE_URL}/${storeHash}/badge?${params}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Stamped.io API error: ${response.status} ${response.statusText}`);
  }

  const data: StampedRatingSummaryResponse = await response.json();

  const cpr = data.countPerRating ?? {};
  const distribution: [number, number, number, number, number] = [
    Number(cpr['1']) || 0,
    Number(cpr['2']) || 0,
    Number(cpr['3']) || 0,
    Number(cpr['4']) || 0,
    Number(cpr['5']) || 0,
  ];

  return {
    averageRating: typeof data.rating === 'number' ? data.rating : 0,
    totalReviews: typeof data.count === 'number' ? data.count : 0,
    distribution,
  };
}
