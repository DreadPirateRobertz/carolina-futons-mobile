import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RecentlyViewedRail } from '../RecentlyViewedRail';
import { ThemeProvider } from '@/theme/ThemeProvider';

const SLUGS = [
  'asheville-full-futon',
  'blue-ridge-queen-futon',
  'pisgah-twin-futon',
  'biltmore-loveseat',
  'hendersonville-queen-murphy-cabinet-bed',
];

function renderRail(props: Partial<React.ComponentProps<typeof RecentlyViewedRail>> = {}) {
  return render(
    <ThemeProvider>
      <RecentlyViewedRail
        slugs={[]}
        currentSlug="pisgah-twin-futon"
        onProductPress={jest.fn()}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('RecentlyViewedRail', () => {
  describe('empty state', () => {
    it('renders nothing when slugs is empty', () => {
      const { queryByTestId } = renderRail({ slugs: [] });
      expect(queryByTestId('recently-viewed-rail')).toBeNull();
    });

    it('renders nothing when all slugs match currentSlug', () => {
      const { queryByTestId } = renderRail({
        slugs: ['pisgah-twin-futon'],
        currentSlug: 'pisgah-twin-futon',
      });
      expect(queryByTestId('recently-viewed-rail')).toBeNull();
    });

    it('renders nothing when slugs contains only unknown products', () => {
      const { queryByTestId } = renderRail({ slugs: ['non-existent-slug-xyz'] });
      expect(queryByTestId('recently-viewed-rail')).toBeNull();
    });
  });

  describe('renders rail', () => {
    it('renders rail when valid slugs exist', () => {
      const { getByTestId } = renderRail({ slugs: SLUGS, currentSlug: 'biltmore-loveseat' });
      expect(getByTestId('recently-viewed-rail')).toBeTruthy();
    });

    it('shows "Recently Viewed" header', () => {
      const { getByText } = renderRail({ slugs: SLUGS, currentSlug: 'biltmore-loveseat' });
      expect(getByText('Recently Viewed')).toBeTruthy();
    });

    it('excludes current product from the rail', () => {
      const { queryByTestId } = renderRail({
        slugs: SLUGS,
        currentSlug: 'asheville-full-futon',
      });
      expect(queryByTestId('recently-viewed-card-asheville-full-futon')).toBeNull();
    });

    it('shows max 5 items', () => {
      const manySlugs = [
        'asheville-full-futon',
        'blue-ridge-queen-futon',
        'pisgah-twin-futon',
        'biltmore-loveseat',
        'hendersonville-queen-murphy-cabinet-bed',
        'extra-slug-1',
        'extra-slug-2',
      ];
      const { getAllByTestId } = renderRail({
        slugs: manySlugs,
        currentSlug: 'non-matching',
      });
      // At most 5 cards rendered (known products only)
      const cards = getAllByTestId(/^recently-viewed-card-/);
      expect(cards.length).toBeLessThanOrEqual(5);
    });

    it('renders card with correct testID for each slug', () => {
      const { getByTestId } = renderRail({
        slugs: ['asheville-full-futon', 'blue-ridge-queen-futon'],
        currentSlug: 'pisgah-twin-futon',
      });
      expect(getByTestId('recently-viewed-card-asheville-full-futon')).toBeTruthy();
      expect(getByTestId('recently-viewed-card-blue-ridge-queen-futon')).toBeTruthy();
    });

    it('renders image with correct testID', () => {
      const { getByTestId } = renderRail({
        slugs: ['asheville-full-futon'],
        currentSlug: 'pisgah-twin-futon',
      });
      expect(getByTestId('recently-viewed-img-asheville-full-futon')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('calls onProductPress with slug when card is tapped', () => {
      const onProductPress = jest.fn();
      const { getByTestId } = renderRail({
        slugs: ['asheville-full-futon', 'blue-ridge-queen-futon'],
        currentSlug: 'pisgah-twin-futon',
        onProductPress,
      });
      fireEvent.press(getByTestId('recently-viewed-card-asheville-full-futon'));
      expect(onProductPress).toHaveBeenCalledWith('asheville-full-futon');
    });

    it('cards have accessibilityRole="button"', () => {
      const { getByTestId } = renderRail({
        slugs: ['asheville-full-futon'],
        currentSlug: 'pisgah-twin-futon',
      });
      const card = getByTestId('recently-viewed-card-asheville-full-futon');
      expect(card.props.accessibilityRole).toBe('button');
    });
  });
});
