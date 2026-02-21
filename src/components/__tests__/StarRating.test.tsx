import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StarRating } from '../StarRating';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderStarRating(props: Partial<React.ComponentProps<typeof StarRating>> = {}) {
  return render(
    <ThemeProvider>
      <StarRating rating={4} testID="star-rating" {...props} />
    </ThemeProvider>,
  );
}

describe('StarRating', () => {
  describe('rendering', () => {
    it('renders 5 stars total', () => {
      const { getAllByText } = renderStarRating({ rating: 3 });
      const filled = getAllByText('\u2605'); // filled star
      const empty = getAllByText('\u2606'); // empty star
      expect(filled.length + empty.length).toBe(5);
    });

    it('renders correct number of filled and empty stars for rating 4', () => {
      const { getAllByText } = renderStarRating({ rating: 4 });
      const filled = getAllByText('\u2605');
      const empty = getAllByText('\u2606');
      expect(filled.length).toBe(4);
      expect(empty.length).toBe(1);
    });

    it('renders all empty stars for rating 0', () => {
      const { queryAllByText } = renderStarRating({ rating: 0 });
      const filled = queryAllByText('\u2605');
      const empty = queryAllByText('\u2606');
      expect(filled.length).toBe(0);
      expect(empty.length).toBe(5);
    });

    it('renders all filled stars for rating 5', () => {
      const { queryAllByText } = renderStarRating({ rating: 5 });
      const filled = queryAllByText('\u2605');
      const empty = queryAllByText('\u2606');
      expect(filled.length).toBe(5);
      expect(empty.length).toBe(0);
    });
  });

  describe('showValue', () => {
    it('shows numeric value when showValue=true', () => {
      const { getByText } = renderStarRating({ rating: 4.3, showValue: true });
      expect(getByText('4.3')).toBeTruthy();
    });

    it('does not show numeric value when showValue=false', () => {
      const { queryByText } = renderStarRating({ rating: 4.3, showValue: false });
      expect(queryByText('4.3')).toBeNull();
    });
  });

  describe('count', () => {
    it('shows count when provided', () => {
      const { getByText } = renderStarRating({ rating: 4, count: 42 });
      expect(getByText('(42)')).toBeTruthy();
    });

    it('does not show count when not provided', () => {
      const { queryByText } = renderStarRating({ rating: 4 });
      expect(queryByText(/\(\d+\)/)).toBeNull();
    });
  });

  describe('interactive mode', () => {
    it('tapping a star calls onRate with the correct rating', () => {
      const onRate = jest.fn();
      const { getByTestId } = renderStarRating({
        rating: 2,
        interactive: true,
        onRate,
        testID: 'star-rating',
      });
      // Tap the 3rd star (index 2, should call onRate with 3)
      fireEvent.press(getByTestId('star-rating-star-3'));
      expect(onRate).toHaveBeenCalledWith(3);
    });

    it('tapping the first star calls onRate with 1', () => {
      const onRate = jest.fn();
      const { getByTestId } = renderStarRating({
        rating: 0,
        interactive: true,
        onRate,
        testID: 'star-rating',
      });
      fireEvent.press(getByTestId('star-rating-star-1'));
      expect(onRate).toHaveBeenCalledWith(1);
    });
  });

  describe('accessibility', () => {
    it('has correct accessibility label', () => {
      const { getByTestId } = renderStarRating({ rating: 4 });
      const container = getByTestId('star-rating');
      expect(container.props.accessibilityLabel).toBe('4 out of 5 stars');
    });

    it('has text accessibility role', () => {
      const { getByTestId } = renderStarRating({ rating: 3 });
      expect(getByTestId('star-rating').props.accessibilityRole).toBe('text');
    });
  });
});
