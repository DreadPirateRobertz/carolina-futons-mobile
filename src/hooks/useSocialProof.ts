/**
 * @module useSocialProof
 *
 * Fetches social proof signals for a product:
 *  - soldThisWeek: number of units sold in past 7 days
 *  - topReview: highest-rated recent review excerpt
 *
 * Both fetches run in parallel. Partial failures are tolerated —
 * each signal degrades independently.
 *
 * hq-5yo88
 */

import { useState, useEffect, useRef } from 'react';
import {
  fetchSoldThisWeek,
  fetchTopReviewExcerpt,
  type ReviewExcerpt,
} from '@/services/socialProofApi';

export interface UseSocialProofResult {
  soldThisWeek?: number;
  topReview: ReviewExcerpt | null;
  isLoading: boolean;
  error: string | null;
}

export function useSocialProof(productId: string): UseSocialProofResult {
  const [soldThisWeek, setSoldThisWeek] = useState<number | undefined>(undefined);
  const [topReview, setTopReview] = useState<ReviewExcerpt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!productId) {
      setIsLoading(false);
      return;
    }

    cancelledRef.current = false;
    setIsLoading(true);
    setError(null);

    let soldError = false;
    let reviewError = false;

    const soldPromise = fetchSoldThisWeek(productId)
      .then((count) => {
        if (!cancelledRef.current) setSoldThisWeek(count);
      })
      .catch(() => {
        soldError = true;
        // soldThisWeek stays undefined — badge won't show
      });

    const reviewPromise = fetchTopReviewExcerpt(productId)
      .then((review) => {
        if (!cancelledRef.current) setTopReview(review);
      })
      .catch(() => {
        reviewError = true;
        if (!cancelledRef.current) setTopReview(null);
      });

    Promise.allSettled([soldPromise, reviewPromise]).then(() => {
      if (!cancelledRef.current) {
        setIsLoading(false);
        // Only set error if BOTH failed
        if (soldError && reviewError) {
          setError('Failed to load social proof signals');
        }
      }
    });

    return () => {
      cancelledRef.current = true;
    };
  }, [productId]);

  return { soldThisWeek, topReview, isLoading, error };
}
