/**
 * TDD stubs for ReviewCard photo lightbox feature.
 *
 * Tests: photo thumbnails are tappable, tapping opens lightbox,
 * lightbox can be closed, reviews with no photos have no tappable thumbnails.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ReviewCard } from '../ReviewCard';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { type Review } from '@/data/reviews';

const reviewWithPhotos: Review = {
  id: 'rev-lightbox-001',
  productId: 'asheville-full',
  authorName: 'Test User',
  rating: 5,
  title: 'Great futon',
  body: 'Really comfortable.',
  createdAt: new Date().toISOString(),
  helpful: 3,
  verified: true,
  photos: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
};

const reviewNoPhotos: Review = {
  ...reviewWithPhotos,
  id: 'rev-lightbox-002',
  photos: undefined,
};

function renderCard(review: Review, testID = 'review-card') {
  return render(
    <ThemeProvider>
      <ReviewCard review={review} testID={testID} />
    </ThemeProvider>,
  );
}

describe('ReviewCard — photo lightbox', () => {
  describe('photo thumbnails', () => {
    it('renders tappable thumbnail for each photo', () => {
      const { getByTestId } = renderCard(reviewWithPhotos);
      expect(getByTestId('review-photo-0')).toBeTruthy();
      expect(getByTestId('review-photo-1')).toBeTruthy();
    });

    it('does not render tappable thumbnails when no photos', () => {
      const { queryByTestId } = renderCard(reviewNoPhotos);
      expect(queryByTestId('review-photo-0')).toBeNull();
    });
  });

  describe('lightbox opens on tap', () => {
    it('lightbox is not visible initially', () => {
      const { queryByTestId } = renderCard(reviewWithPhotos);
      expect(queryByTestId('review-lightbox')).toBeNull();
    });

    it('opens lightbox when first photo thumbnail is tapped', () => {
      const { getByTestId } = renderCard(reviewWithPhotos);
      fireEvent.press(getByTestId('review-photo-0'));
      expect(getByTestId('review-lightbox')).toBeTruthy();
    });

    it('opens lightbox when second photo thumbnail is tapped', () => {
      const { getByTestId } = renderCard(reviewWithPhotos);
      fireEvent.press(getByTestId('review-photo-1'));
      expect(getByTestId('review-lightbox')).toBeTruthy();
    });
  });

  describe('lightbox close', () => {
    it('closes lightbox when close button is pressed', () => {
      const { getByTestId, queryByTestId } = renderCard(reviewWithPhotos);
      fireEvent.press(getByTestId('review-photo-0'));
      expect(getByTestId('review-lightbox')).toBeTruthy();
      fireEvent.press(getByTestId('review-lightbox-close'));
      expect(queryByTestId('review-lightbox')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('photo thumbnail has accessibility label', () => {
      const { getByTestId } = renderCard(reviewWithPhotos);
      const thumb = getByTestId('review-photo-0');
      expect(thumb.props.accessibilityLabel).toBeTruthy();
    });

    it('lightbox close button has accessibility label', () => {
      const { getByTestId } = renderCard(reviewWithPhotos);
      fireEvent.press(getByTestId('review-photo-0'));
      const closeBtn = getByTestId('review-lightbox-close');
      expect(closeBtn.props.accessibilityLabel).toBeTruthy();
    });
  });
});
