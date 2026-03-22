/**
 * @module useReviews
 *
 * Product review management: listing, sorting, submission with optimistic UI,
 * and "helpful" voting. When a WixClient is available via context, submissions
 * go through the Wix Data CMS API with optimistic insert + rollback on failure.
 * Falls back to local-only mock submission when no client is configured.
 */
import { useState, useMemo, useCallback, useRef } from 'react';
import {
  type Review,
  type ReviewSummary,
  getReviewsForProduct,
  getReviewSummary,
  sortReviews,
  MOCK_REVIEWS,
} from '@/data/reviews';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { events } from '@/services/analytics';
import * as gamification from '@/services/gamification';

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
  hasReviews: boolean;
  submitError: string | null;
  submitSuccess: boolean;
  clearSubmitStatus: () => void;
}

/**
 * Hook for managing product reviews: listing, sorting, submission, and helpful votes.
 * Wires to the Wix CMS API when a client is available; falls back to mock data otherwise.
 */
export function useReviews(productId: string): UseReviewsReturn {
  const [sort, setSort] = useState<ReviewSort>('helpful');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [localReviews, setLocalReviews] = useState<Review[]>([]);
  const [helpfulVotes, setHelpfulVotes] = useState<Set<string>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const wixClient = useOptionalWixClient();
  const localReviewsRef = useRef(localReviews);
  localReviewsRef.current = localReviews;

  const allReviews = useMemo(() => {
    const existing = getReviewsForProduct(productId);
    return [...localReviews, ...existing];
  }, [productId, localReviews]);

  const reviews = useMemo(() => sortReviews(allReviews, sort), [allReviews, sort]);

  const summary = useMemo((): ReviewSummary => {
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
  }, [productId, localReviews, allReviews]);

  const submitReview = useCallback(
    async (data: SubmitReviewData): Promise<boolean> => {
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(false);

      const optimisticId = `rev-local-${Date.now()}`;
      const optimisticReview: Review = {
        id: optimisticId,
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

      // Add optimistic review immediately
      setLocalReviews((prev) => [optimisticReview, ...prev]);

      if (wixClient) {
        // ── Wix API path ──
        try {
          const serverReview = await wixClient.createReview({
            productId,
            authorName: 'You',
            rating: data.rating,
            title: data.title,
            body: data.body,
            photos: data.photos,
          });

          // Replace optimistic entry with server response
          setLocalReviews((prev) =>
            prev.map((r) =>
              r.id === optimisticId
                ? {
                    ...serverReview,
                    // Normalize to our Review shape
                    verified: serverReview.verified ?? true,
                  }
                : r,
            ),
          );

          setShowForm(false);
          setSubmitSuccess(true);
          events.submitReview(productId, data.rating);
          gamification.submitReview(productId, data.rating, data.photos.length > 0);
          return true;
        } catch {
          // Roll back optimistic review
          setLocalReviews((prev) => prev.filter((r) => r.id !== optimisticId));
          setSubmitError('Failed to submit review. Please try again.');
          return false;
        } finally {
          setIsSubmitting(false);
        }
      } else {
        // ── Mock fallback path ──
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          setShowForm(false);
          setSubmitSuccess(true);
          events.submitReview(productId, data.rating);
          gamification.submitReview(productId, data.rating, data.photos.length > 0);
          return true;
        } catch {
          setLocalReviews((prev) => prev.filter((r) => r.id !== optimisticId));
          setSubmitError('Failed to submit review. Please try again.');
          return false;
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [productId, wixClient],
  );

  const markHelpful = useCallback(
    (reviewId: string) => {
      if (helpfulVotes.has(reviewId)) return;
      setHelpfulVotes((prev) => new Set(prev).add(reviewId));
      const review = MOCK_REVIEWS.find((r) => r.id === reviewId);
      if (review) review.helpful += 1;
      const localReview = localReviews.find((r) => r.id === reviewId);
      if (localReview) localReview.helpful += 1;
      events.helpfulVote(reviewId, productId);
    },
    [productId, helpfulVotes, localReviews],
  );

  const clearSubmitStatus = useCallback(() => {
    setSubmitError(null);
    setSubmitSuccess(false);
  }, []);

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
    hasReviews: reviews.length > 0,
    submitError,
    submitSuccess,
    clearSubmitStatus,
  };
}
