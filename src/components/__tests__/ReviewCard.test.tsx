import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ReviewCard } from '../ReviewCard';
import { ThemeProvider } from '@/theme/ThemeProvider';

const baseReview = {
  id: 'rev-1',
  productId: 'prod-asheville-full',
  rating: 5,
  title: 'Amazing futon!',
  body: 'Super comfortable and looks beautiful in my living room.',
  authorName: 'Sarah M.',
  createdAt: '2026-01-15T12:00:00Z',
  helpfulCount: 12,
  isVerifiedPurchase: true,
  photos: [] as string[],
};

function renderReviewCard(
  overrides: Partial<typeof baseReview> = {},
  props: Record<string, any> = {},
) {
  return render(
    <ThemeProvider>
      <ReviewCard review={{ ...baseReview, ...overrides }} {...props} />
    </ThemeProvider>,
  );
}

describe('ReviewCard', () => {
  describe('rendering', () => {
    it('renders with testID', () => {
      const { getByTestId } = renderReviewCard();
      expect(getByTestId('review-card-rev-1')).toBeTruthy();
    });

    it('shows review title', () => {
      const { getByText } = renderReviewCard();
      expect(getByText('Amazing futon!')).toBeTruthy();
    });

    it('shows review body', () => {
      const { getByText } = renderReviewCard();
      expect(getByText('Super comfortable and looks beautiful in my living room.')).toBeTruthy();
    });

    it('shows author name', () => {
      const { getByText } = renderReviewCard();
      expect(getByText('Sarah M.')).toBeTruthy();
    });

    it('shows formatted date', () => {
      const { getByTestId } = renderReviewCard();
      expect(getByTestId('review-date-rev-1')).toBeTruthy();
    });
  });

  describe('star rating display', () => {
    it('shows 5 filled stars for rating 5', () => {
      const { getByTestId } = renderReviewCard({ rating: 5 });
      expect(getByTestId('review-stars-rev-1').props.children).toBe('★★★★★');
    });

    it('shows 3 filled and 2 empty stars for rating 3', () => {
      const { getByTestId } = renderReviewCard({ rating: 3 });
      expect(getByTestId('review-stars-rev-1').props.children).toBe('★★★☆☆');
    });

    it('shows 1 filled and 4 empty stars for rating 1', () => {
      const { getByTestId } = renderReviewCard({ rating: 1 });
      expect(getByTestId('review-stars-rev-1').props.children).toBe('★☆☆☆☆');
    });
  });

  describe('verified purchase badge', () => {
    it('shows verified badge for verified purchases', () => {
      const { getByTestId } = renderReviewCard({ isVerifiedPurchase: true });
      expect(getByTestId('verified-badge-rev-1')).toBeTruthy();
    });

    it('does not show verified badge for unverified reviews', () => {
      const { queryByTestId } = renderReviewCard({ isVerifiedPurchase: false });
      expect(queryByTestId('verified-badge-rev-1')).toBeNull();
    });
  });

  describe('photos', () => {
    it('does not render photo section when no photos', () => {
      const { queryByTestId } = renderReviewCard({ photos: [] });
      expect(queryByTestId('review-photos-rev-1')).toBeNull();
    });

    it('renders photo thumbnails when photos present', () => {
      const { getByTestId } = renderReviewCard({
        photos: ['photo1.jpg', 'photo2.jpg'],
      });
      expect(getByTestId('review-photos-rev-1')).toBeTruthy();
      expect(getByTestId('review-photo-0')).toBeTruthy();
      expect(getByTestId('review-photo-1')).toBeTruthy();
    });
  });

  describe('helpful button', () => {
    it('shows helpful count', () => {
      const { getByTestId } = renderReviewCard({ helpfulCount: 12 });
      expect(getByTestId('helpful-count-rev-1').props.children).toBe(12);
    });

    it('calls onMarkHelpful when pressed', () => {
      const onMarkHelpful = jest.fn();
      const { getByTestId } = renderReviewCard({}, { onMarkHelpful });
      fireEvent.press(getByTestId('helpful-button-rev-1'));
      expect(onMarkHelpful).toHaveBeenCalledWith('rev-1');
    });

    it('does not crash when onMarkHelpful not provided', () => {
      const { getByTestId } = renderReviewCard();
      expect(() => fireEvent.press(getByTestId('helpful-button-rev-1'))).not.toThrow();
    });
  });

  describe('accessibility', () => {
    it('has accessible label with rating and author', () => {
      const { getByTestId } = renderReviewCard();
      const card = getByTestId('review-card-rev-1');
      expect(card.props.accessibilityLabel).toContain('5');
      expect(card.props.accessibilityLabel).toContain('Sarah M.');
    });

    it('helpful button has accessibility label', () => {
      const { getByTestId } = renderReviewCard({ helpfulCount: 12 });
      const btn = getByTestId('helpful-button-rev-1');
      expect(btn.props.accessibilityLabel).toContain('helpful');
      expect(btn.props.accessibilityRole).toBe('button');
    });
  });
});
