/**
 * VideoReview data type and seed data.
 * Fetched from Wix CMS `VideoReviews` collection in production.
 * Seed data used as fallback in dev / when no WixClient is available.
 *
 * Bead: cm-vid
 */

export interface VideoReview {
  id: string;
  productId: string;
  videoUrl: string;
  /** Thumbnail image URI for the scroll strip. */
  thumbnailUrl: string;
  authorName: string;
  title: string;
  /** Duration in seconds. */
  duration: number;
  createdAt: string;
  /** Star rating 1-5. */
  rating: number;
}

/**
 * Seed video reviews used when no WixClient is available.
 * Covers the two primary products so the UI renders in dev/test.
 */
export const MOCK_VIDEO_REVIEWS: VideoReview[] = [
  {
    id: 'vr-001',
    productId: 'asheville-full',
    videoUrl: 'https://cdn.carolinafutons.com/reviews/vr-001.mp4',
    thumbnailUrl: 'https://cdn.carolinafutons.com/reviews/vr-001-thumb.jpg',
    authorName: 'Taylor B.',
    title: 'Perfect sofa-bed for my studio',
    duration: 45,
    createdAt: '2026-03-01T14:00:00Z',
    rating: 5,
  },
  {
    id: 'vr-002',
    productId: 'asheville-full',
    videoUrl: 'https://cdn.carolinafutons.com/reviews/vr-002.mp4',
    thumbnailUrl: 'https://cdn.carolinafutons.com/reviews/vr-002-thumb.jpg',
    authorName: 'Jordan K.',
    title: 'Great quality, easy assembly',
    duration: 62,
    createdAt: '2026-02-20T09:30:00Z',
    rating: 4,
  },
  {
    id: 'vr-003',
    productId: 'columbia-queen',
    videoUrl: 'https://cdn.carolinafutons.com/reviews/vr-003.mp4',
    thumbnailUrl: 'https://cdn.carolinafutons.com/reviews/vr-003-thumb.jpg',
    authorName: 'Alex R.',
    title: 'Queen size is huge and comfy',
    duration: 38,
    createdAt: '2026-03-10T16:45:00Z',
    rating: 5,
  },
];

/** Returns seed video reviews for the given product ID. */
export function getVideoReviewsForProduct(productId: string): VideoReview[] {
  return MOCK_VIDEO_REVIEWS.filter((v) => v.productId === productId);
}
