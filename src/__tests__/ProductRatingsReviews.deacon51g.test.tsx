/**
 * Acceptance tests: product ratings & reviews
 *
 * AC (deacon-51g):
 *  1. ProductCard renders star rating (filled/empty) and review count
 *  2. ReviewForm: 1-5 star selection required, title + body required, submits
 *     with correct shape including photos array
 *  3. Empty reviews state: product with zero reviews returns empty array,
 *     aggregate zeros, no error
 *  4. Network error on submit: optimistic review is rolled back, submitError
 *     is set, form stays open
 *
 * @bead deacon-51g
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { renderHook, act } from '@testing-library/react-native';

// ── ProductCard deps ──────────────────────────────────────────────────────────

import { ProductCard } from '@/components/ProductCard';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';
import { type Product } from '@/data/products';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'Medium', Light: 'Light' },
}));

jest.mock('@/components/ProductCardVideo', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ProductCardVideo: ({ testID }: { testID?: string }) => React.createElement(View, { testID }),
  };
});

jest.mock('@/components/BNPLModal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BNPLModal: ({ visible, testID }: { visible: boolean; testID?: string }) =>
      visible ? React.createElement(View, { testID: testID ?? 'bnpl-modal' }) : null,
  };
});

jest.mock('@/hooks/useInventoryBadge', () => ({
  useInventoryBadge: () => ({ badge: 'none', quantity: 0, isLoading: false, error: null }),
}));

// ── ReviewForm deps ───────────────────────────────────────────────────────────

import { ReviewForm } from '@/components/ReviewForm';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('@/services/uploadReviewPhoto', () => ({
  uploadReviewPhoto: jest.fn().mockResolvedValue({ mediaUrl: 'https://cdn.wix.com/photo.jpg' }),
}));

// ── useReviews deps ───────────────────────────────────────────────────────────

import { useReviews } from '@/hooks/useReviews';

jest.mock('@/hooks/useGamificationEvents', () => ({
  useGamificationEvents: () => ({
    addToCart: jest.fn(),
    submitReview: jest.fn().mockResolvedValue({ success: true }),
    referralShared: jest.fn(),
    arUsed: jest.fn(),
    wishlistAdd: jest.fn(),
  }),
}));

const mockCreateReview = jest.fn();
let mockWixClient: { createReview: jest.Mock } | null = null;

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

// ── useProductReviews deps ────────────────────────────────────────────────────

import { useProductReviews } from '@/hooks/useProductReviews';

const mockQueryData = jest.fn();
let mockProductReviewsWixClient: { queryData: jest.Mock } | null = null;

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockProductReviewsWixClient,
}));

jest.mock('@/services/crashReporting', () => ({ captureException: jest.fn() }));

jest.mock('@/data/reviews', () => ({
  ...jest.requireActual('@/data/reviews'),
  getReviewsForProduct: jest.fn().mockReturnValue([]),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const baseProduct: Product = {
  id: 'asheville-full' as Product['id'],
  name: 'Asheville Futon',
  slug: 'asheville-full',
  category: 'futons',
  price: 549,
  description: 'A great futon.',
  shortDescription: 'Comfortable convertible futon.',
  images: [{ uri: 'https://example.com/img.jpg', alt: 'Asheville' }],
  rating: 4.2,
  reviewCount: 37,
  inStock: true,
  fabricOptions: ['Natural', 'Java'],
  dimensions: { width: 54, depth: 32, height: 34 },
};

function renderCard(product: Product = baseProduct) {
  return render(
    <ThemeProvider>
      <WishlistProvider>
        <CompareProvider>
          <ProductCard product={product} />
        </CompareProvider>
      </WishlistProvider>
    </ThemeProvider>,
  );
}

function renderForm(props: Partial<React.ComponentProps<typeof ReviewForm>> = {}) {
  const onSubmit = props.onSubmit ?? jest.fn();
  return {
    ...render(
      <ThemeProvider>
        <ReviewForm onSubmit={onSubmit} {...props} />
      </ThemeProvider>,
    ),
    onSubmit,
  };
}

// ── AC 1: ProductCard star rating + review count ─────────────────────────────

describe('AC1 — ProductCard: star rating and review count', () => {
  it('renders filled and empty stars matching the product rating (rounded)', () => {
    const { getByText } = renderCard();
    // rating 4.2 → 4 filled, 1 empty
    expect(getByText('★★★★☆')).toBeTruthy();
  });

  it('renders the review count in parentheses', () => {
    const { getByText } = renderCard();
    expect(getByText('(37)')).toBeTruthy();
  });

  it('renders 5 filled stars for a perfect-rated product', () => {
    const { getByText } = renderCard({ ...baseProduct, rating: 5, reviewCount: 10 });
    expect(getByText('★★★★★')).toBeTruthy();
    expect(getByText('(10)')).toBeTruthy();
  });

  it('renders all empty stars for a zero-rated product', () => {
    const { getByText } = renderCard({ ...baseProduct, rating: 0, reviewCount: 0 });
    expect(getByText('☆☆☆☆☆')).toBeTruthy();
    expect(getByText('(0)')).toBeTruthy();
  });
});

// ── AC 2: ReviewForm — 1-5 stars + text fields required, correct submit shape ─

describe('AC2 — ReviewForm: star selection, required fields, submit shape', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not submit when no star rating is selected', () => {
    const { getByTestId, onSubmit } = renderForm();
    fireEvent.changeText(getByTestId('review-title-input'), 'Great futon');
    fireEvent.changeText(getByTestId('review-body-input'), 'Very comfortable.');
    fireEvent.press(getByTestId('submit-review-button'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a rating error when submitting without selecting stars', () => {
    const { getByTestId } = renderForm();
    fireEvent.press(getByTestId('submit-review-button'));
    expect(getByTestId('rating-error')).toBeTruthy();
  });

  it('does not submit when title is empty', () => {
    const { getByTestId, onSubmit } = renderForm();
    fireEvent.press(getByTestId('star-button-5'));
    fireEvent.changeText(getByTestId('review-body-input'), 'Great product.');
    fireEvent.press(getByTestId('submit-review-button'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not submit when body is empty', () => {
    const { getByTestId, onSubmit } = renderForm();
    fireEvent.press(getByTestId('star-button-4'));
    fireEvent.changeText(getByTestId('review-title-input'), 'Good futon');
    fireEvent.press(getByTestId('submit-review-button'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with rating, title, body, and empty photos when all fields filled', () => {
    const { getByTestId, onSubmit } = renderForm();
    fireEvent.press(getByTestId('star-button-3'));
    fireEvent.changeText(getByTestId('review-title-input'), 'Decent futon');
    fireEvent.changeText(getByTestId('review-body-input'), 'It works well enough.');
    fireEvent.press(getByTestId('submit-review-button'));
    expect(onSubmit).toHaveBeenCalledWith({
      rating: 3,
      title: 'Decent futon',
      body: 'It works well enough.',
      photos: [],
    });
  });

  it('clears rating error after a star is selected', () => {
    const { getByTestId, queryByTestId } = renderForm();
    fireEvent.press(getByTestId('submit-review-button')); // trigger error
    expect(getByTestId('rating-error')).toBeTruthy();
    fireEvent.press(getByTestId('star-button-5')); // select rating
    expect(queryByTestId('rating-error')).toBeNull();
  });

  it('disables submit button while isSubmitting is true', () => {
    const { getByTestId } = renderForm({ isSubmitting: true });
    expect(getByTestId('submit-review-button').props.accessibilityState?.disabled).toBe(true);
  });
});

// ── AC 3: Empty reviews state ─────────────────────────────────────────────────

describe('AC3 — Empty reviews state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProductReviewsWixClient = { queryData: mockQueryData };
  });

  afterEach(() => {
    mockProductReviewsWixClient = null;
  });

  it('useProductReviews returns empty array and zero aggregate for a new product', async () => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });

    const { result } = renderHook(() => useProductReviews('brand-new-product'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reviews).toEqual([]);
    expect(result.current.aggregate.averageRating).toBe(0);
    expect(result.current.aggregate.totalReviews).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('useReviews returns hasReviews=false for a product with no reviews', () => {
    mockWixClient = null;
    const { result } = renderHook(() => useReviews('brand-new-product'));
    expect(result.current.hasReviews).toBe(false);
    expect(result.current.reviews).toEqual([]);
    expect(result.current.summary.totalReviews).toBe(0);
    expect(result.current.summary.averageRating).toBe(0);
  });
});

// ── AC 4: Network error on submit — rollback + error message ─────────────────

describe('AC4 — Network error on submit: rollback and error shown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWixClient = { createReview: mockCreateReview };
  });

  it('rolls back the optimistic review when the Wix API rejects', async () => {
    mockCreateReview.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useReviews('asheville-full'));
    const initialCount = result.current.reviews.length;

    await act(async () => {
      await result.current.submitReview({
        rating: 5,
        title: 'Doomed review',
        body: 'This will fail.',
        photos: [],
      });
    });

    expect(result.current.reviews).toHaveLength(initialCount);
    expect(result.current.reviews.find((r) => r.title === 'Doomed review')).toBeUndefined();
  });

  it('sets submitError to a non-null string when the API rejects', async () => {
    mockCreateReview.mockRejectedValue(new Error('Timeout'));

    const { result } = renderHook(() => useReviews('asheville-full'));

    await act(async () => {
      await result.current.submitReview({
        rating: 4,
        title: 'Error review',
        body: 'This also fails.',
        photos: [],
      });
    });

    expect(typeof result.current.submitError).toBe('string');
    expect(result.current.submitError).not.toBeNull();
  });

  it('returns false from submitReview on API failure', async () => {
    mockCreateReview.mockRejectedValue(new Error('Server down'));

    const { result } = renderHook(() => useReviews('asheville-full'));

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.submitReview({
        rating: 5,
        title: 'Will fail',
        body: 'Server is down.',
        photos: [],
      });
    });

    expect(success).toBe(false);
  });

  it('keeps the review form open after a failed submission', async () => {
    mockCreateReview.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useReviews('asheville-full'));
    await act(async () => result.current.setShowForm(true));

    await act(async () => {
      await result.current.submitReview({
        rating: 4,
        title: 'Will fail',
        body: 'Keeps form open.',
        photos: [],
      });
    });

    expect(result.current.showForm).toBe(true);
  });
});
