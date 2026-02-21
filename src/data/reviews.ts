/**
 * Product review data and helpers.
 * Mock data now; designed for Wix CMS API integration later.
 */

export interface Review {
  id: string;
  productId: string;
  authorName: string;
  rating: number; // 1-5
  title: string;
  body: string;
  createdAt: string; // ISO date
  helpful: number; // helpful vote count
  verified: boolean; // verified purchase
  photos?: string[]; // optional photo URIs
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: [number, number, number, number, number]; // counts for 1-5 stars
}

/**
 * Mock review data spread across three products.
 * In production, fetched from Wix CMS API.
 */
export const MOCK_REVIEWS: Review[] = [
  // --- asheville-full (7 reviews) ---
  {
    id: 'rev-001',
    productId: 'asheville-full',
    authorName: 'Sarah M.',
    rating: 5,
    title: 'Best futon I have ever owned',
    body: 'The Asheville is incredibly comfortable both as a sofa and a bed. The innerspring mattress has great support and the hardwood frame feels rock solid. Assembly took about 30 minutes. Highly recommend.',
    createdAt: '2026-02-10T14:22:00Z',
    helpful: 18,
    verified: true,
    photos: [
      'https://placeholder.co/600x400/D4C5A9/3A2518?text=Review+Photo+1',
      'https://placeholder.co/600x400/D4C5A9/3A2518?text=Review+Photo+2',
    ],
  },
  {
    id: 'rev-002',
    productId: 'asheville-full',
    authorName: 'James T.',
    rating: 4,
    title: 'Great quality, minor delivery hiccup',
    body: 'The futon itself is fantastic -- sturdy frame and the Natural Linen fabric looks great in our living room. Delivery was delayed by a day but the customer service team kept us updated. Very happy overall.',
    createdAt: '2026-02-05T09:10:00Z',
    helpful: 12,
    verified: true,
  },
  {
    id: 'rev-003',
    productId: 'asheville-full',
    authorName: 'Priya K.',
    rating: 5,
    title: 'Perfect for our guest room',
    body: 'We needed something that worked as both a couch and a guest bed and the Asheville delivers on both fronts. Our guests raved about how comfortable it was. The Mountain Blue fabric is gorgeous.',
    createdAt: '2026-01-28T16:45:00Z',
    helpful: 9,
    verified: true,
    photos: ['https://placeholder.co/600x400/5B8FA8/FFFFFF?text=Guest+Room+Setup'],
  },
  {
    id: 'rev-004',
    productId: 'asheville-full',
    authorName: 'Derek W.',
    rating: 4,
    title: 'Solid construction, comfortable cushion',
    body: 'Put this together in my basement media room. The frame is heavier than I expected which is a good sign. Mattress is supportive without being too firm. Only wish it came in a wider color selection.',
    createdAt: '2026-01-20T11:30:00Z',
    helpful: 6,
    verified: true,
  },
  {
    id: 'rev-005',
    productId: 'asheville-full',
    authorName: 'Michelle L.',
    rating: 5,
    title: 'Exceeded my expectations',
    body: 'I was skeptical about buying a futon online but this completely won me over. The fabric quality is much better than what I have seen at big box stores and the conversion mechanism is smooth.',
    createdAt: '2026-01-15T20:00:00Z',
    helpful: 14,
    verified: true,
    photos: ['https://placeholder.co/600x400/E8845C/FFFFFF?text=Coral+Fabric+Close'],
  },
  {
    id: 'rev-006',
    productId: 'asheville-full',
    authorName: 'Tom R.',
    rating: 3,
    title: 'Good but mattress needs break-in',
    body: 'Frame is beautiful and well made. The mattress was quite stiff out of the box -- took about two weeks to soften up. Now it is comfortable but be aware of the break-in period.',
    createdAt: '2026-01-08T13:15:00Z',
    helpful: 22,
    verified: true,
  },
  {
    id: 'rev-007',
    productId: 'asheville-full',
    authorName: 'Grace H.',
    rating: 4,
    title: 'Beautiful piece of furniture',
    body: 'This does not look like a typical futon at all. The Slate Gray fabric gives it a modern feel and the frame has a nice warm finish. Gets compliments from everyone who visits.',
    createdAt: '2025-12-29T17:40:00Z',
    helpful: 7,
    verified: false,
  },
  // --- blue-ridge-queen (6 reviews) ---
  {
    id: 'rev-008',
    productId: 'blue-ridge-queen',
    authorName: 'Karen P.',
    rating: 5,
    title: 'Worth every penny',
    body: 'The pocket coil mattress makes all the difference. I sleep on this every night and it is as comfortable as my old traditional mattress. The queen size gives plenty of room to stretch out.',
    createdAt: '2026-02-12T08:30:00Z',
    helpful: 25,
    verified: true,
    photos: [
      'https://placeholder.co/600x400/5B8FA8/FFFFFF?text=Blue+Ridge+Living+Room',
      'https://placeholder.co/600x400/5B8FA8/FFFFFF?text=Blue+Ridge+Bed+Mode',
    ],
  },
  {
    id: 'rev-009',
    productId: 'blue-ridge-queen',
    authorName: 'Mike D.',
    rating: 5,
    title: 'Premium quality through and through',
    body: 'From the packaging to the final assembly, everything about this futon screams quality. The ash frame is beautiful and the Espresso Brown fabric hides wear well. Delivery was fast -- arrived three days early.',
    createdAt: '2026-02-01T12:00:00Z',
    helpful: 16,
    verified: true,
  },
  {
    id: 'rev-010',
    productId: 'blue-ridge-queen',
    authorName: 'Aisha J.',
    rating: 4,
    title: 'Great futon, tight fit in doorway',
    body: 'The futon itself is excellent and super comfortable. Just measure your doorways first -- the queen frame is large and we had to remove a door to get it into the room. Once set up it is perfect.',
    createdAt: '2026-01-22T15:20:00Z',
    helpful: 31,
    verified: true,
  },
  {
    id: 'rev-011',
    productId: 'blue-ridge-queen',
    authorName: 'Robert C.',
    rating: 5,
    title: 'Replaced our sofa bed',
    body: 'We got rid of our old pull-out sofa bed and replaced it with the Blue Ridge. Night and day difference in comfort. The conversion is so much easier too -- no wrestling with metal bars. Charcoal fabric looks sharp.',
    createdAt: '2026-01-14T19:05:00Z',
    helpful: 11,
    verified: true,
    photos: ['https://placeholder.co/600x400/3D3D3D/FFFFFF?text=Charcoal+Setup'],
  },
  {
    id: 'rev-012',
    productId: 'blue-ridge-queen',
    authorName: 'Linda S.',
    rating: 3,
    title: 'Nice but pricey',
    body: 'It is a well-made futon and the queen size is generous. However at this price point I expected the cover fabric to be included rather than an upcharge for the nicer colors. Comfort is excellent though.',
    createdAt: '2026-01-05T10:45:00Z',
    helpful: 8,
    verified: false,
  },
  {
    id: 'rev-013',
    productId: 'blue-ridge-queen',
    authorName: 'Chris N.',
    rating: 4,
    title: 'Sturdy and comfortable',
    body: 'Bought this for my apartment and it handles daily use as my main couch with no issues. The pocket coil mattress does not sag at all. Frame feels like it will last for years.',
    createdAt: '2025-12-20T14:30:00Z',
    helpful: 5,
    verified: true,
  },
  // --- smoky-sleeper (5 reviews) ---
  {
    id: 'rev-014',
    productId: 'smoky-sleeper',
    authorName: 'Emily F.',
    rating: 5,
    title: 'So cozy and well built',
    body: 'The Smoky Sleeper is exactly what we needed for our cabin. The fabric feels durable yet soft and the whole thing converts in seconds. Has already survived a weekend with the kids.',
    createdAt: '2026-02-15T18:00:00Z',
    helpful: 13,
    verified: true,
    photos: [
      'https://placeholder.co/600x400/4A7C59/FFFFFF?text=Cabin+Living+Room',
      'https://placeholder.co/600x400/4A7C59/FFFFFF?text=Smoky+Bed+Mode',
      'https://placeholder.co/600x400/4A7C59/FFFFFF?text=Smoky+Detail',
    ],
  },
  {
    id: 'rev-015',
    productId: 'smoky-sleeper',
    authorName: 'Dan B.',
    rating: 4,
    title: 'Comfortable and practical',
    body: 'Good everyday futon. The cushion is thick enough for nightly sleeping and the frame does not creak. Took about 45 minutes to assemble which was a bit longer than expected but the instructions were clear.',
    createdAt: '2026-02-08T07:50:00Z',
    helpful: 4,
    verified: true,
  },
  {
    id: 'rev-016',
    productId: 'smoky-sleeper',
    authorName: 'Hannah W.',
    rating: 2,
    title: 'Fabric color was off',
    body: 'The futon frame and mattress are fine quality but the Forest Green fabric I ordered looked much darker in person than on the website. It is more of an olive than a true green. Comfort is okay but not as plush as I hoped.',
    createdAt: '2026-01-30T22:15:00Z',
    helpful: 19,
    verified: true,
    photos: ['https://placeholder.co/600x400/4A7C59/FFFFFF?text=Color+Comparison'],
  },
  {
    id: 'rev-017',
    productId: 'smoky-sleeper',
    authorName: 'Marcus A.',
    rating: 5,
    title: 'Perfect dorm room futon',
    body: 'Fits perfectly in my dorm room and is way more comfortable than the ones my roommates bought from big box stores. The Natural Linen looks clean and modern. Easy to fold down when friends crash.',
    createdAt: '2026-01-18T11:00:00Z',
    helpful: 10,
    verified: true,
  },
  {
    id: 'rev-018',
    productId: 'smoky-sleeper',
    authorName: 'Jessica T.',
    rating: 4,
    title: 'Solid choice for the price',
    body: 'Great value futon. The delivery team was professional and set it up in the room for us. Mattress is supportive and the Slate Gray fabric hides stains well which is a plus with two cats.',
    createdAt: '2026-01-10T16:30:00Z',
    helpful: 7,
    verified: false,
  },
];

/** Returns all reviews for a given product, ordered by creation date descending. */
export function getReviewsForProduct(productId: string): Review[] {
  return MOCK_REVIEWS.filter((r) => r.productId === productId).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Computes a summary (average, total, distribution) from reviews for a product. */
export function getReviewSummary(productId: string): ReviewSummary {
  const reviews = MOCK_REVIEWS.filter((r) => r.productId === productId);
  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];

  for (const review of reviews) {
    distribution[review.rating - 1] += 1;
  }

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : 0;

  return { averageRating, totalReviews, distribution };
}

/** Sorts a reviews array by the given strategy (returns a new array). */
export function sortReviews(
  reviews: Review[],
  sort: 'recent' | 'helpful' | 'highest' | 'lowest',
): Review[] {
  const sorted = [...reviews];

  switch (sort) {
    case 'recent':
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case 'helpful':
      return sorted.sort((a, b) => b.helpful - a.helpful);
    case 'highest':
      return sorted.sort((a, b) => b.rating - a.rating || b.helpful - a.helpful);
    case 'lowest':
      return sorted.sort((a, b) => a.rating - b.rating || b.helpful - a.helpful);
    default:
      return sorted;
  }
}
