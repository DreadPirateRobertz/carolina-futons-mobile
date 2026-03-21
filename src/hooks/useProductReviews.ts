/**
 * @module useProductReviews
 *
 * Fetches product reviews from the Wix CMS CF-k8hw collection and returns
 * them with an aggregate star rating. Falls back to empty results when no
 * WixClient is available (unauthenticated / not configured).
 *
 * Returns:
 *  - reviews: Review[] — fetched items, most recent first (up to 100)
 *  - aggregate: { averageRating, totalReviews }
 *      averageRating — computed from fetched items
 *      totalReviews  — server-reported total (may exceed 100 if paginated)
 *  - isLoading: boolean — true while the initial fetch is in-flight
 *  - error: string | null — error message on API failure, null otherwise
 *
 * Bead: cm-e0r
 */

import { useState, useEffect, useMemo } from 'react';
import { useOptionalWixClient } from '@/services/wix';
import type { Review } from '@/data/reviews';
import { captureException } from '@/services/crashReporting';

/** CF-k8hw is the Wix CMS collection ID for product reviews. */
const REVIEWS_COLLECTION = 'CF-k8hw';

export interface ReviewAggregate {
  averageRating: number;
  /** Server-reported total, may exceed the number of fetched reviews. */
  totalReviews: number;
}

export interface UseProductReviewsResult {
  reviews: Review[];
  aggregate: ReviewAggregate;
  isLoading: boolean;
  error: string | null;
}

/** Raw item shape returned by the CF-k8hw collection. */
interface RawReviewItem {
  id?: string;
  productId?: string;
  authorName?: string;
  rating?: number;
  title?: string;
  body?: string;
  createdAt?: string;
  helpful?: number;
  verified?: boolean;
  photos?: string[];
  [key: string]: unknown;
}

/** Compute average rating from fetched reviews; count comes from the server total. */
function computeAggregate(reviews: Review[], totalReviews: number): ReviewAggregate {
  if (totalReviews === 0 || reviews.length === 0) return { averageRating: 0, totalReviews };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = Math.round((sum / reviews.length) * 10) / 10;
  return { averageRating, totalReviews };
}

function rawToReview(item: RawReviewItem): Review {
  // Clamp rating to valid [1, 5] range per Review type contract. Non-numeric => 0.
  const rawRating = typeof item.rating === 'number' ? item.rating : 0;
  const rating = rawRating > 0 ? Math.max(1, Math.min(5, rawRating)) : 0;

  return {
    id: String(item.id ?? ''),
    productId: String(item.productId ?? ''),
    authorName: String(item.authorName ?? ''),
    rating,
    title: String(item.title ?? ''),
    body: String(item.body ?? ''),
    createdAt: String(item.createdAt ?? new Date(0).toISOString()),
    helpful: typeof item.helpful === 'number' ? item.helpful : 0,
    verified: Boolean(item.verified),
    ...(Array.isArray(item.photos) && item.photos.length > 0
      ? { photos: item.photos.filter((p): p is string => typeof p === 'string') }
      : {}),
  };
}

/**
 * Fetches reviews for a product from the Wix CMS CF-k8hw collection.
 *
 * @param productId - The product ID to filter reviews by.
 */
export function useProductReviews(productId: string): UseProductReviewsResult {
  const wixClient = useOptionalWixClient();
  const [reviews, setReviews] = useState<Review[]>([]);
  // Server-reported total — may exceed reviews.length when there are >100 reviews.
  const [totalReviews, setTotalReviews] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derive aggregate from current state — stays in sync without extra state.
  const aggregate = useMemo(() => computeAggregate(reviews, totalReviews), [reviews, totalReviews]);

  useEffect(() => {
    if (!wixClient) {
      setReviews([]);
      setTotalReviews(0);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const result = await wixClient.queryData<RawReviewItem>(REVIEWS_COLLECTION, {
          filter: { productId: { $eq: productId } },
          sort: [{ fieldName: 'createdAt', order: 'DESC' }],
          limit: 100,
        });

        if (cancelled) return;
        setReviews(result.items.map(rawToReview));
        setTotalReviews(result.totalResults);
      } catch (err) {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error('Failed to load reviews');
        captureException(error, 'error', {
          action: 'useProductReviews/queryData',
          collection: REVIEWS_COLLECTION,
        });
        setError(error.message);
        setReviews([]);
        setTotalReviews(0);
      } finally {
        // finally always runs -- even after cancelled return in catch.
        // Guard here prevents state update on unmounted component.
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, wixClient]);

  return {
    reviews,
    aggregate,
    isLoading,
    error,
  };
}
