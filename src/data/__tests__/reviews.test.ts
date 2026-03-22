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

// ── Seed data coverage (cm-c01) ───────────────────────────────────────────────

describe('seed data coverage (cm-c01)', () => {
  const SEEDED_PRODUCTS = [
    'asheville-full',
    'blue-ridge-queen',
    'smoky-sleeper',
    'pisgah-twin',
    'biltmore-loveseat',
  ];

  it.each(SEEDED_PRODUCTS)('has at least 3 reviews for %s', (productId) => {
    expect(getReviewsForProduct(productId).length).toBeGreaterThanOrEqual(3);
  });

  it.each(SEEDED_PRODUCTS)('has at least one 5-star review for %s', (productId) => {
    const fiveStars = getReviewsForProduct(productId).filter((r) => r.rating === 5);
    expect(fiveStars.length).toBeGreaterThanOrEqual(1);
  });

  it.each(SEEDED_PRODUCTS)('has a mix of ratings (not all the same) for %s', (productId) => {
    const ratings = new Set(getReviewsForProduct(productId).map((r) => r.rating));
    expect(ratings.size).toBeGreaterThanOrEqual(2);
  });

  it.each(SEEDED_PRODUCTS)('all reviews have required fields for %s', (productId) => {
    getReviewsForProduct(productId).forEach((r) => {
      expect(typeof r.id).toBe('string');
      expect(r.id.length).toBeGreaterThan(0);
      expect(r.productId).toBe(productId);
      expect(typeof r.authorName).toBe('string');
      expect(r.rating).toBeGreaterThanOrEqual(1);
      expect(r.rating).toBeLessThanOrEqual(5);
      expect(typeof r.title).toBe('string');
      expect(typeof r.body).toBe('string');
      expect(typeof r.createdAt).toBe('string');
    });
  });

  it('pisgah-twin has 5 seed reviews', () => {
    expect(getReviewsForProduct('pisgah-twin').length).toBe(5);
  });

  it('biltmore-loveseat has 5 seed reviews', () => {
    expect(getReviewsForProduct('biltmore-loveseat').length).toBe(5);
  });

  it('biltmore-loveseat has a 1-star review (edge case — damaged product)', () => {
    const oneStars = getReviewsForProduct('biltmore-loveseat').filter((r) => r.rating === 1);
    expect(oneStars.length).toBeGreaterThanOrEqual(1);
  });

  it('at least one product has reviews with photos', () => {
    const hasPhotos = SEEDED_PRODUCTS.some((productId) =>
      getReviewsForProduct(productId).some((r) => r.photos && r.photos.length > 0),
    );
    expect(hasPhotos).toBe(true);
  });

  it('review IDs are unique across all seeded products', () => {
    const allIds = SEEDED_PRODUCTS.flatMap((p) => getReviewsForProduct(p).map((r) => r.id));
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});
