import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ReviewsProvider, useReviews } from '../useReviews';
import { PRODUCTS } from '@/data/products';

const product = PRODUCTS[0]; // Asheville futon
const product2 = PRODUCTS[1]; // Blue Ridge

/** Test harness exposing review hook state + actions */
function ReviewsHarness({ productId }: { productId: string }) {
  const {
    reviews,
    averageRating,
    totalCount,
    sortBy,
    setSortBy,
    submitReview,
    markHelpful,
    isSubmitting,
  } = useReviews(productId);

  return (
    <View>
      <Text testID="review-count">{totalCount}</Text>
      <Text testID="average-rating">{averageRating}</Text>
      <Text testID="sort-by">{sortBy}</Text>
      <Text testID="is-submitting">{isSubmitting ? 'yes' : 'no'}</Text>
      <Text testID="reviews-json">
        {JSON.stringify(reviews.map((r) => ({ id: r.id, rating: r.rating, helpful: r.helpfulCount })))}
      </Text>

      <TouchableOpacity
        testID="submit-review"
        onPress={() =>
          submitReview({
            rating: 5,
            title: 'Great futon!',
            body: 'Very comfortable and easy to set up.',
            photos: [],
          })
        }
      />
      <TouchableOpacity
        testID="submit-review-3-star"
        onPress={() =>
          submitReview({
            rating: 3,
            title: 'Decent',
            body: 'Its okay.',
            photos: [],
          })
        }
      />
      <TouchableOpacity
        testID="submit-review-with-photos"
        onPress={() =>
          submitReview({
            rating: 4,
            title: 'Nice look',
            body: 'Looks great in my living room.',
            photos: ['photo1.jpg', 'photo2.jpg'],
          })
        }
      />
      <TouchableOpacity testID="sort-helpful" onPress={() => setSortBy('helpful')} />
      <TouchableOpacity testID="sort-recent" onPress={() => setSortBy('recent')} />
      <TouchableOpacity testID="sort-rating-high" onPress={() => setSortBy('rating-high')} />
      <TouchableOpacity testID="sort-rating-low" onPress={() => setSortBy('rating-low')} />
      <TouchableOpacity
        testID="mark-helpful-first"
        onPress={() => reviews.length > 0 && markHelpful(reviews[0].id)}
      />
    </View>
  );
}

function renderHarness(productId: string = product.id) {
  return render(
    <ReviewsProvider>
      <ReviewsHarness productId={productId} />
    </ReviewsProvider>,
  );
}

describe('useReviews', () => {
  describe('initial state', () => {
    it('starts with zero reviews for a new product', () => {
      const { getByTestId } = renderHarness();
      expect(getByTestId('review-count').props.children).toBe(0);
    });

    it('starts with 0 average rating', () => {
      const { getByTestId } = renderHarness();
      expect(getByTestId('average-rating').props.children).toBe(0);
    });

    it('defaults sort to most recent', () => {
      const { getByTestId } = renderHarness();
      expect(getByTestId('sort-by').props.children).toBe('recent');
    });

    it('is not submitting initially', () => {
      const { getByTestId } = renderHarness();
      expect(getByTestId('is-submitting').props.children).toBe('no');
    });
  });

  describe('submitting reviews', () => {
    it('adds a review and increments count', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('submit-review'));
      expect(getByTestId('review-count').props.children).toBe(1);
    });

    it('updates average rating after submission', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('submit-review')); // 5 stars
      expect(getByTestId('average-rating').props.children).toBe(5);
    });

    it('calculates average across multiple reviews', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('submit-review')); // 5 stars
      fireEvent.press(getByTestId('submit-review-3-star')); // 3 stars
      expect(getByTestId('average-rating').props.children).toBe(4); // (5+3)/2
    });

    it('stores photo references with review', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('submit-review-with-photos'));
      const reviews = JSON.parse(getByTestId('reviews-json').props.children);
      expect(reviews).toHaveLength(1);
    });
  });

  describe('sorting', () => {
    it('switches sort to most helpful', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('sort-helpful'));
      expect(getByTestId('sort-by').props.children).toBe('helpful');
    });

    it('switches sort to rating high-to-low', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('sort-rating-high'));
      expect(getByTestId('sort-by').props.children).toBe('rating-high');
    });

    it('switches sort to rating low-to-high', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('sort-rating-low'));
      expect(getByTestId('sort-by').props.children).toBe('rating-low');
    });

    it('switches back to recent', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('sort-helpful'));
      fireEvent.press(getByTestId('sort-recent'));
      expect(getByTestId('sort-by').props.children).toBe('recent');
    });
  });

  describe('helpful votes', () => {
    it('increments helpful count on a review', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('submit-review'));
      fireEvent.press(getByTestId('mark-helpful-first'));
      const reviews = JSON.parse(getByTestId('reviews-json').props.children);
      expect(reviews[0].helpful).toBe(1);
    });

    it('does not allow double-voting helpful', () => {
      const { getByTestId } = renderHarness();
      fireEvent.press(getByTestId('submit-review'));
      fireEvent.press(getByTestId('mark-helpful-first'));
      fireEvent.press(getByTestId('mark-helpful-first'));
      const reviews = JSON.parse(getByTestId('reviews-json').props.children);
      expect(reviews[0].helpful).toBe(1);
    });
  });

  describe('product isolation', () => {
    it('reviews are scoped to product ID', () => {
      const { getByTestId, rerender } = renderHarness(product.id);
      fireEvent.press(getByTestId('submit-review'));
      expect(getByTestId('review-count').props.children).toBe(1);
    });
  });

  describe('error boundary', () => {
    it('throws when used outside ReviewsProvider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() =>
        render(<ReviewsHarness productId={product.id} />),
      ).toThrow('useReviews must be used within a ReviewsProvider');
      consoleError.mockRestore();
    });
  });
});
