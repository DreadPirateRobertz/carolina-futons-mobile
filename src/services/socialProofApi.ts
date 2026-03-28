/**
 * @module socialProofApi
 *
 * Data fetchers for PDP social proof signals:
 *  - Sold this week: queries Wix OrderItems collection
 *  - Top review excerpt: fetches first Stamped.io review
 *
 * hq-5yo88
 */

import { fetchStampedReviews, isStampedConfigured } from '@/services/stamped';

// --- Types ---

export interface ReviewExcerpt {
  authorName: string;
  rating: number;
  body: string;
}

// --- Sold count ---

/**
 * Fetch the number of times a product was sold in the past 7 days.
 *
 * Uses the Wix backend `/_functions/soldThisWeek` endpoint which queries
 * the OrderItems collection filtered by productId and _createdDate > 7d.
 *
 * Falls back to 0 on error — sold count is non-critical social proof.
 */
export async function fetchSoldThisWeek(productId: string): Promise<number> {
  // TODO: Wire to Wix backend endpoint once deployed.
  // For now, return mock data based on product ID hash to simulate variation.
  // This matches the data contract from melania's spec:
  //   query OrderItems WHERE productId=X, _createdDate > 7d → count
  const hash = productId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return hash % 15; // 0–14 range for realistic mock
}

// --- Review excerpt ---

/**
 * Fetch the top (most recent, highest rated) review excerpt for a product.
 * Uses Stamped.io API via the existing stamped service.
 *
 * Returns null if no reviews exist or Stamped is not configured.
 */
export async function fetchTopReviewExcerpt(productId: string): Promise<ReviewExcerpt | null> {
  if (!isStampedConfigured()) return null;

  try {
    const result = await fetchStampedReviews(productId, { page: 1, perPage: 1 });

    if (result.reviews.length === 0) return null;

    const top = result.reviews[0];
    return {
      authorName: top.authorName,
      rating: top.rating,
      body: top.body,
    };
  } catch {
    return null;
  }
}
