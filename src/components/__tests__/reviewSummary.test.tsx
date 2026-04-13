import React from 'react';
import { render } from '@testing-library/react-native';
import { ReviewSummary } from '../ReviewSummary';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { ReviewSummary as ReviewSummaryType } from '@/data/reviews';

const mockSummary: ReviewSummaryType = {
  averageRating: 4.3,
  totalReviews: 7,
  distribution: [0, 0, 1, 3, 3], // 1-star: 0, 2-star: 0, 3-star: 1, 4-star: 3, 5-star: 3
};

function renderSummary(summary: ReviewSummaryType = mockSummary) {
  return render(
    <ThemeProvider>
      <ReviewSummary summary={summary} />
    </ThemeProvider>,
  );
}

describe('ReviewSummary', () => {
  describe('rendering', () => {
    it('renders average rating text', () => {
      const { getByTestId } = renderSummary();
      const averageEl = getByTestId('review-average');
      expect(averageEl).toBeTruthy();
      // averageRating.toFixed(1) => "4.3"
      expect(averageEl.props.children).toBe('4.3');
    });

    it('renders total review count text', () => {
      const { getByTestId } = renderSummary();
      const totalEl = getByTestId('review-total-count');
      expect(totalEl).toBeTruthy();
    });

    it('shows plural "reviews" for totalReviews > 1', () => {
      const { getByText } = renderSummary();
      expect(getByText('7 reviews')).toBeTruthy();
    });

    it('uses singular "review" when totalReviews=1', () => {
      const singleSummary: ReviewSummaryType = {
        averageRating: 5.0,
        totalReviews: 1,
        distribution: [0, 0, 0, 0, 1],
      };
      const { getByText } = renderSummary(singleSummary);
      expect(getByText('1 review')).toBeTruthy();
    });
  });

  describe('distribution bars', () => {
    it('renders all 5 distribution bars', () => {
      const { getByTestId } = renderSummary();
      for (let star = 1; star <= 5; star++) {
        expect(getByTestId(`distribution-row-${star}`)).toBeTruthy();
      }
    });

    it('renders correct count for each distribution bar', () => {
      const { getByTestId } = renderSummary();
      // distribution[0] is 1-star count=0, distribution[4] is 5-star count=3
      // The component renders rows from 5 down to 1
      for (let star = 1; star <= 5; star++) {
        const row = getByTestId(`distribution-row-${star}`);
        expect(row).toBeTruthy();
      }
    });
  });

  describe('edge cases', () => {
    it('renders correctly with zero reviews', () => {
      const emptySummary: ReviewSummaryType = {
        averageRating: 0,
        totalReviews: 0,
        distribution: [0, 0, 0, 0, 0],
      };
      const { getByTestId, getByText } = renderSummary(emptySummary);
      expect(getByTestId('review-summary')).toBeTruthy();
      expect(getByText('0 reviews')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('has accessibility label on the average rating', () => {
      const { getByTestId } = renderSummary();
      const averageEl = getByTestId('review-average');
      expect(averageEl.props.accessibilityLabel).toBe('4.3 out of 5 stars');
    });
  });
});
