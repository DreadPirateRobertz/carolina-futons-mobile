import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ReviewCard } from '../ReviewCard';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { type Review } from '@/data/reviews';

const baseReview: Review = {
  id: 'rev-test-001',
  productId: 'asheville-full',
  authorName: 'Sarah M.',
  rating: 5,
  title: 'Best futon I have ever owned',
  body: 'The Asheville is incredibly comfortable both as a sofa and a bed.',
  createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
  helpful: 18,
  verified: true,
  photos: [
    'https://placeholder.co/600x400/D4C5A9/3A2518?text=Photo+1',
    'https://placeholder.co/600x400/D4C5A9/3A2518?text=Photo+2',
  ],
};

function renderCard(
  overrides: Partial<Review> = {},
  props: { onHelpful?: jest.Mock; testID?: string } = {},
) {
  const review = { ...baseReview, ...overrides };
  return {
    ...render(
      <ThemeProvider>
        <ReviewCard review={review} onHelpful={props.onHelpful} testID={props.testID} />
      </ThemeProvider>,
    ),
    review,
  };
}

describe('ReviewCard', () => {
  describe('rendering', () => {
    it('renders author name', () => {
      const { getByText } = renderCard();
      expect(getByText('Sarah M.')).toBeTruthy();
    });

    it('renders review title', () => {
      const { getByText } = renderCard();
      expect(getByText('Best futon I have ever owned')).toBeTruthy();
    });

    it('renders review body', () => {
      const { getByText } = renderCard();
      expect(
        getByText('The Asheville is incredibly comfortable both as a sofa and a bed.'),
      ).toBeTruthy();
    });
  });

  describe('verified badge', () => {
    it('shows verified badge when verified=true', () => {
      const { getByText } = renderCard({ verified: true });
      expect(getByText(/Verified Purchase/)).toBeTruthy();
    });

    it('hides verified badge when verified=false', () => {
      const { queryByText } = renderCard({ verified: false });
      expect(queryByText(/Verified Purchase/)).toBeNull();
    });
  });

  describe('photos', () => {
    it('shows photo thumbnails when photos provided', () => {
      const { getByTestId } = renderCard(
        {
          photos: [
            'https://placeholder.co/600x400/D4C5A9/3A2518?text=Photo+1',
            'https://placeholder.co/600x400/D4C5A9/3A2518?text=Photo+2',
          ],
        },
        { testID: 'review-card' },
      );
      expect(getByTestId('review-card')).toBeTruthy();
    });

    it('does not render photo row when no photos', () => {
      const { queryByLabelText } = renderCard({ photos: undefined });
      expect(queryByLabelText('Review photo 1')).toBeNull();
    });
  });

  describe('helpful button', () => {
    it('calls onHelpful with review id when pressed', () => {
      const onHelpful = jest.fn();
      const { getByTestId } = renderCard({}, { onHelpful });
      fireEvent.press(getByTestId(`review-helpful-${baseReview.id}`));
      expect(onHelpful).toHaveBeenCalledWith(baseReview.id);
    });

    it('shows helpful count', () => {
      const { getByText } = renderCard({ helpful: 18 });
      expect(getByText('Helpful (18)')).toBeTruthy();
    });
  });

  describe('relative date', () => {
    it('shows relative date text', () => {
      const { getByText } = renderCard();
      expect(getByText('3 days ago')).toBeTruthy();
    });

    it('shows "just now" for very recent reviews', () => {
      const { getByText } = renderCard({ createdAt: new Date().toISOString() });
      expect(getByText('just now')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('has correct accessibility label with author and rating', () => {
      const { getByTestId } = renderCard();
      const card = getByTestId(`review-card-${baseReview.id}`);
      expect(card.props.accessibilityLabel).toContain('Sarah M.');
      expect(card.props.accessibilityLabel).toContain('5 stars');
    });
  });
});
