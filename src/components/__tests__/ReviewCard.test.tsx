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

    it('does not render photo row when photos is empty array', () => {
      const { queryByLabelText } = renderCard({ photos: [] });
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
    it('shows "just now" for very recent reviews', () => {
      const { getByText } = renderCard({ createdAt: new Date().toISOString() });
      expect(getByText('just now')).toBeTruthy();
    });

    it('shows "1 minute ago" for singular minute', () => {
      const { getByText } = renderCard({
        createdAt: new Date(Date.now() - 90 * 1000).toISOString(),
      });
      expect(getByText('1 minute ago')).toBeTruthy();
    });

    it('shows plural minutes', () => {
      const { getByText } = renderCard({
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      });
      expect(getByText('5 minutes ago')).toBeTruthy();
    });

    it('shows "1 hour ago" for singular hour', () => {
      const { getByText } = renderCard({
        createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      });
      expect(getByText('1 hour ago')).toBeTruthy();
    });

    it('shows plural hours', () => {
      const { getByText } = renderCard({
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      });
      expect(getByText('5 hours ago')).toBeTruthy();
    });

    it('shows "1 day ago" for singular day', () => {
      const { getByText } = renderCard({
        createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
      });
      expect(getByText('1 day ago')).toBeTruthy();
    });

    it('shows plural days', () => {
      const { getByText } = renderCard({
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(getByText('3 days ago')).toBeTruthy();
    });

    it('shows "1 week ago" for singular week', () => {
      const { getByText } = renderCard({
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(getByText('1 week ago')).toBeTruthy();
    });

    it('shows plural weeks', () => {
      const { getByText } = renderCard({
        createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(getByText('3 weeks ago')).toBeTruthy();
    });

    it('shows "1 month ago" for singular month', () => {
      const { getByText } = renderCard({
        createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(getByText('1 month ago')).toBeTruthy();
    });

    it('shows plural months', () => {
      const { getByText } = renderCard({
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(getByText('3 months ago')).toBeTruthy();
    });

    it('shows "1 year ago" for singular year', () => {
      const { getByText } = renderCard({
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(getByText('1 year ago')).toBeTruthy();
    });

    it('shows plural years', () => {
      const { getByText } = renderCard({
        createdAt: new Date(Date.now() - 800 * 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(getByText('2 years ago')).toBeTruthy();
    });
  });

  describe('custom testID', () => {
    it('uses custom testID for card', () => {
      const { getByTestId } = renderCard({}, { testID: 'my-review' });
      expect(getByTestId('my-review')).toBeTruthy();
    });

    it('uses custom testID for helpful button', () => {
      const { getByTestId } = renderCard({}, { testID: 'my-review' });
      expect(getByTestId('my-review-helpful')).toBeTruthy();
    });

    it('defaults to review id testID', () => {
      const { getByTestId } = renderCard();
      expect(getByTestId(`review-card-${baseReview.id}`)).toBeTruthy();
    });
  });

  describe('no onHelpful callback', () => {
    it('renders without crashing when onHelpful is undefined', () => {
      const { getByTestId } = renderCard();
      fireEvent.press(getByTestId(`review-helpful-${baseReview.id}`));
      // Should not throw
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
