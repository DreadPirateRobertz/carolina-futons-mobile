import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  type Review,
  type ReviewSummary,
  getReviewsForProduct,
  getReviewSummary,
  sortReviews,
  MOCK_REVIEWS,
} from '@/data/reviews';
import { events } from '@/services/analytics';
import { getWixClientInstance } from '@/services/wix/singleton';

type ReviewSort = 'recent' | 'helpful' | 'highest' | 'lowest';

interface SubmitReviewData {
  rating: number;
  title: string;
  body: string;
  photos: string[];
}

interface UseReviewsReturn {
  reviews: Review[];
  summary: ReviewSummary;
  sort: ReviewSort;
  setSort: (sort: ReviewSort) => void;
  isSubmitting: boolean;
  submitReview: (data: SubmitReviewData) => Promise<boolean>;
  markHelpful: (reviewId: string) => void;
  showForm: boolean;
  setShowForm: (show: boolean) => void;
}

/**
 * Hook for managing product reviews: listing, sorting, submission, and helpful votes.
 * Tries Wix CMS API, falls back to mock data.
 */
export function useReviews(productId: string): UseReviewsReturn {
  const [sort, setSort] = useState<ReviewSort>('helpful');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [localReviews, setLocalReviews] = useState<Review[]>([]);
  const [helpfulVotes, setHelpfulVotes] = useState<Set<string>>(new Set());
  const [apiReviews, setApiReviews] = useState<Review[] | null>(null);
  const mounted = useRef(true);

  // Try to fetch reviews from Wix CMS
  useEffect(() => {
    mounted.current = true;

    const client = getWixClientInstance();
    if (client) {
      (async () => {
        try {
          const result = await client.queryReviews(productId, { limit: 100 });
          if (mounted.current && result.reviews.length > 0) {
            setApiReviews(result.reviews);
          }
        } catch {
          // Keep mock data on failure
        }
      })();
    }

    return () => {
      mounted.current = false;
    };
  }, [productId]);

  const allReviews = useMemo(() => {
    const existing = apiReviews ?? getReviewsForProduct(productId);
    return [...localReviews, ...existing];
  }, [productId, localReviews, apiReviews]);

  const reviews = useMemo(() => sortReviews(allReviews, sort), [allReviews, sort]);

  const summary = useMemo((): ReviewSummary => {
    if (apiReviews) {
      // Compute summary from API reviews + local
      const all = [...localReviews, ...apiReviews];
      const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
      for (const review of all) {
        if (review.rating >= 1 && review.rating <= 5) {
          distribution[review.rating - 1] += 1;
        }
      }
      const totalReviews = all.length;
      const averageRating =
        totalReviews > 0
          ? Math.round((all.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
          : 0;
      return { averageRating, totalReviews, distribution };
    }

    // Mock fallback
    const base = getReviewSummary(productId);
    for (const review of localReviews) {
      base.distribution[review.rating - 1] += 1;
      base.totalReviews += 1;
    }
    if (base.totalReviews > 0) {
      const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
      base.averageRating = Math.round((sum / base.totalReviews) * 10) / 10;
    }
    return base;
  }, [productId, localReviews, allReviews, apiReviews]);

  const submitReview = useCallback(
    async (data: SubmitReviewData): Promise<boolean> => {
      setIsSubmitting(true);
      try {
        // Simulate API call (will be replaced with Wix CMS write when available)
        await new Promise((resolve) => setTimeout(resolve, 500));

        const newReview: Review = {
          id: `rev-local-${Date.now()}`,
          productId,
          authorName: 'You',
          rating: data.rating,
          title: data.title,
          body: data.body,
          createdAt: new Date().toISOString(),
          helpful: 0,
          verified: true,
          photos: data.photos.length > 0 ? data.photos : undefined,
        };

        setLocalReviews((prev) => [newReview, ...prev]);
        setShowForm(false);
        events.submitReview(productId, data.rating);
        return true;
      } catch {
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [productId],
  );

  const markHelpful = useCallback(
    (reviewId: string) => {
      if (helpfulVotes.has(reviewId)) return;
      setHelpfulVotes((prev) => new Set(prev).add(reviewId));
      // Update the helpful count in mock data (in-memory only)
      const review = MOCK_REVIEWS.find((r) => r.id === reviewId);
      if (review) review.helpful += 1;
      const localReview = localReviews.find((r) => r.id === reviewId);
      if (localReview) localReview.helpful += 1;
      events.helpfulVote(reviewId, productId);
    },
    [productId, helpfulVotes, localReviews],
  );

  return {
    reviews,
    summary,
    sort,
    setSort,
    isSubmitting,
    submitReview,
    markHelpful,
    showForm,
    setShowForm,
  };
}
