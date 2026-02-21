import { getReviewsForProduct, getReviewSummary, sortReviews } from '../reviews';

describe('getReviewsForProduct', () => {
  it('returns correct reviews for asheville-full', () => {
    const reviews = getReviewsForProduct('asheville-full');
    expect(reviews.length).toBe(7);
    expect(reviews.every((r) => r.productId === 'asheville-full')).toBe(true);
  });

  it('returns reviews ordered by date descending (newest first)', () => {
    const reviews = getReviewsForProduct('asheville-full');
    for (let i = 1; i < reviews.length; i++) {
      const prev = new Date(reviews[i - 1].createdAt).getTime();
      const curr = new Date(reviews[i].createdAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it('returns empty array for unknown product', () => {
    const reviews = getReviewsForProduct('nonexistent-product');
    expect(reviews).toEqual([]);
  });
});

describe('getReviewSummary', () => {
  it('returns correct totalReviews for asheville-full', () => {
    const summary = getReviewSummary('asheville-full');
    expect(summary.totalReviews).toBe(7);
  });

  it('returns averageRating as a number', () => {
    const summary = getReviewSummary('asheville-full');
    expect(typeof summary.averageRating).toBe('number');
  });

  it('averageRating is between 1 and 5 when reviews exist', () => {
    const summary = getReviewSummary('asheville-full');
    expect(summary.averageRating).toBeGreaterThanOrEqual(1);
    expect(summary.averageRating).toBeLessThanOrEqual(5);
  });

  it('distribution sums to totalReviews', () => {
    const summary = getReviewSummary('asheville-full');
    const distributionSum = summary.distribution.reduce((sum, count) => sum + count, 0);
    expect(distributionSum).toBe(summary.totalReviews);
  });

  it('returns zero averageRating and totalReviews for unknown product', () => {
    const summary = getReviewSummary('nonexistent-product');
    expect(summary.averageRating).toBe(0);
    expect(summary.totalReviews).toBe(0);
    expect(summary.distribution).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('sortReviews', () => {
  const reviews = getReviewsForProduct('asheville-full');

  it('recent: returns newest first', () => {
    const sorted = sortReviews(reviews, 'recent');
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].createdAt).getTime();
      const curr = new Date(sorted[i].createdAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it('helpful: returns most helpful first', () => {
    const sorted = sortReviews(reviews, 'helpful');
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].helpful).toBeGreaterThanOrEqual(sorted[i].helpful);
    }
  });

  it('highest: returns highest rated first', () => {
    const sorted = sortReviews(reviews, 'highest');
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].rating).toBeGreaterThanOrEqual(sorted[i].rating);
    }
  });

  it('lowest: returns lowest rated first', () => {
    const sorted = sortReviews(reviews, 'lowest');
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].rating).toBeLessThanOrEqual(sorted[i].rating);
    }
  });

  it('does not mutate the original array', () => {
    const original = [...reviews];
    sortReviews(reviews, 'helpful');
    expect(reviews.map((r) => r.id)).toEqual(original.map((r) => r.id));
  });
});
