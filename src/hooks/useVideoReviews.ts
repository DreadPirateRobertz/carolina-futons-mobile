/**
 * @module useVideoReviews
 *
 * Fetches video reviews from the Wix CMS `VideoReviews` collection and returns
 * them sorted by recency. Falls back to seed data when no WixClient is available.
 *
 * Returns:
 *  - videos: VideoReview[] — fetched items, most recent first (up to 50)
 *  - isLoading: boolean — true while the initial fetch is in-flight
 *  - error: string | null — error message on API failure, null otherwise
 *
 * Bead: cm-vid / deacon-2c0d
 */

import { useState, useEffect } from 'react';
import { useOptionalWixClient } from '@/services/wix';
import { type VideoReview, getVideoReviewsForProduct } from '@/data/videoReviews';
import { captureException } from '@/services/crashReporting';

/** Wix CMS collection ID for video reviews. */
const VIDEO_REVIEWS_COLLECTION = 'VideoReviews';

export interface UseVideoReviewsResult {
  videos: VideoReview[];
  isLoading: boolean;
  error: string | null;
}

/** Raw item shape returned by the VideoReviews collection. */
interface RawVideoReviewItem {
  id?: unknown;
  productId?: unknown;
  videoUrl?: unknown;
  thumbnailUrl?: unknown;
  authorName?: unknown;
  title?: unknown;
  duration?: unknown;
  createdAt?: unknown;
  rating?: unknown;
  [key: string]: unknown;
}

function rawToVideoReview(item: RawVideoReviewItem): VideoReview {
  const rawRating = typeof item.rating === 'number' ? item.rating : 1;
  const rating = Math.max(1, Math.min(5, rawRating));

  return {
    id: String(item.id ?? ''),
    productId: String(item.productId ?? ''),
    videoUrl: String(item.videoUrl ?? ''),
    thumbnailUrl: String(item.thumbnailUrl ?? ''),
    authorName: String(item.authorName ?? ''),
    title: String(item.title ?? ''),
    duration: typeof item.duration === 'number' ? item.duration : 0,
    createdAt: String(item.createdAt ?? new Date(0).toISOString()),
    rating,
  };
}

/**
 * Fetches video reviews for a product from the Wix CMS VideoReviews collection.
 *
 * @param productId - The product ID to filter video reviews by.
 */
export function useVideoReviews(productId: string): UseVideoReviewsResult {
  const wixClient = useOptionalWixClient();
  const [videos, setVideos] = useState<VideoReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wixClient) {
      const seed = getVideoReviewsForProduct(productId);
      setVideos(seed);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const result = await wixClient.queryData<RawVideoReviewItem>(VIDEO_REVIEWS_COLLECTION, {
          filter: { productId: { $eq: productId } },
          sort: [{ fieldName: 'createdAt', order: 'DESC' }],
          limit: 50,
        });

        if (cancelled) return;
        setVideos(result.items.map(rawToVideoReview));
      } catch (err) {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error('Failed to load video reviews');
        captureException(error, 'error', {
          action: 'useVideoReviews/queryData',
          collection: VIDEO_REVIEWS_COLLECTION,
        });
        setError(error.message);
        setVideos([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, wixClient]);

  return { videos, isLoading, error };
}
