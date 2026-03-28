/**
 * @module useStampedReviews
 *
 * React hook for Stamped.io product reviews with pagination support.
 * Fetches reviews + rating summary on mount. Supports loadMore (appends)
 * and refresh (resets to page 1).
 *
 * hq-tcdpe
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchStampedReviews,
  fetchStampedRatingSummary,
  isStampedConfigured,
} from '@/services/stamped';
import type { Review, ReviewSummary } from '@/data/reviews';
import { captureException } from '@/services/crashReporting';

const PER_PAGE = 10;

const EMPTY_SUMMARY: ReviewSummary = {
  averageRating: 0,
  totalReviews: 0,
  distribution: [0, 0, 0, 0, 0],
};

export interface UseStampedReviewsResult {
  reviews: Review[];
  summary: ReviewSummary;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useStampedReviews(productId: string): UseStampedReviewsResult {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const pageRef = useRef(1);

  const fetchPage = useCallback(
    async (page: number, append: boolean) => {
      try {
        const [reviewsResult, summaryResult] = await Promise.all([
          fetchStampedReviews(productId, { page, perPage: PER_PAGE }),
          // Only fetch summary on first page (it doesn't change per page)
          page === 1 ? fetchStampedRatingSummary(productId) : Promise.resolve(null),
        ]);

        setReviews((prev) =>
          append ? [...prev, ...reviewsResult.reviews] : reviewsResult.reviews,
        );
        setTotal(reviewsResult.total);

        if (summaryResult) {
          setSummary(summaryResult);
        }

        setError(null);
        pageRef.current = page;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        captureException(err instanceof Error ? err : new Error(message), 'error', {
          action: 'useStampedReviews/fetch',
          productId,
          page,
        });
        setError(message);
        if (!append) {
          setReviews([]);
          setTotal(0);
          setSummary(EMPTY_SUMMARY);
        }
      }
    },
    [productId],
  );

  useEffect(() => {
    // Skip fetch entirely when Stamped.io env vars aren't configured —
    // avoids a doomed request on every PDP mount in dev/unconfigured envs.
    if (!isStampedConfigured()) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    setIsLoading(true);
    pageRef.current = 1;

    fetchPage(1, false).finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const hasMore = reviews.length < total;

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    await fetchPage(pageRef.current + 1, true);
  }, [hasMore, fetchPage]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchPage(1, false);
    setIsLoading(false);
  }, [fetchPage]);

  return { reviews, summary, isLoading, error, hasMore, loadMore, refresh };
}
