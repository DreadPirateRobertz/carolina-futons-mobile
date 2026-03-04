import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { StoreLocatorScreen } from '../StoreLocatorScreen';
import { STORES } from '@/data/stores';
import { typography } from '@/theme/tokens';

const renderScreen = (props?: Partial<React.ComponentProps<typeof StoreLocatorScreen>>) =>
  render(
    <ThemeProvider>
      <StoreLocatorScreen {...props} />
    </ThemeProvider>,
  );

describe('StoreLocatorScreen', () => {
  describe('rendering', () => {
    it('renders with default testID', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('store-locator-screen')).toBeTruthy();
    });

    it('renders custom testID', () => {
      const { getByTestId } = renderScreen({ testID: 'custom-locator' });
      expect(getByTestId('custom-locator')).toBeTruthy();
    });

    it('renders header with title', () => {
      const { getByText } = renderScreen();
      expect(getByText('Find a Showroom')).toBeTruthy();
    });

    it('renders store count in subtitle', () => {
      const { getByText } = renderScreen();
      expect(getByText(`${STORES.length} locations across the Carolinas`)).toBeTruthy();
    });

    it('renders store list', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('store-list')).toBeTruthy();
    });

    it('renders a card for each store', () => {
      const { getAllByTestId } = renderScreen();
      const cards = getAllByTestId(/^store-card-/);
      expect(cards.length).toBe(STORES.length);
    });
  });

  describe('search', () => {
    it('filters stores by city name', () => {
      const { getByPlaceholderText, queryByTestId } = renderScreen();
      const searchInput = getByPlaceholderText('Search by city, state, or zip...');
      fireEvent.changeText(searchInput, 'Charlotte');
      expect(queryByTestId('store-card-store-charlotte')).toBeTruthy();
      expect(queryByTestId('store-card-store-asheville')).toBeFalsy();
    });

    it('filters stores by state', () => {
      const { getByPlaceholderText, queryByTestId } = renderScreen();
      const searchInput = getByPlaceholderText('Search by city, state, or zip...');
      fireEvent.changeText(searchInput, 'SC');
      expect(queryByTestId('store-card-store-greenville')).toBeTruthy();
      expect(queryByTestId('store-card-store-asheville')).toBeFalsy();
    });

    it('filters stores by zip code', () => {
      const { getByPlaceholderText, queryByTestId } = renderScreen();
      const searchInput = getByPlaceholderText('Search by city, state, or zip...');
      fireEvent.changeText(searchInput, '28801');
      expect(queryByTestId('store-card-store-asheville')).toBeTruthy();
      expect(queryByTestId('store-card-store-charlotte')).toBeFalsy();
    });

    it('shows empty state when no results match', () => {
      const { getByPlaceholderText, getByTestId } = renderScreen();
      const searchInput = getByPlaceholderText('Search by city, state, or zip...');
      fireEvent.changeText(searchInput, 'Nonexistent City');
      expect(getByTestId('store-locator-empty')).toBeTruthy();
    });

    it('search is case insensitive', () => {
      const { getByPlaceholderText, queryByTestId } = renderScreen();
      const searchInput = getByPlaceholderText('Search by city, state, or zip...');
      fireEvent.changeText(searchInput, 'ASHEVILLE');
      expect(queryByTestId('store-card-store-asheville')).toBeTruthy();
    });
  });

  describe('distance sorting', () => {
    it('sorts stores by distance when user location provided', () => {
      // Raleigh coordinates — Raleigh store should be first
      const { getAllByTestId } = renderScreen({
        userLatitude: 35.7876,
        userLongitude: -78.6389,
      });
      const cards = getAllByTestId(/^store-card-/);
      expect(cards[0].props.testID).toBe('store-card-store-raleigh');
    });
  });

  describe('Visual polish — warm treatment', () => {
    it('title uses heading fontFamily', () => {
      const { getByTestId } = renderScreen();
      const title = getByTestId('store-locator-title');
      const styles = Array.isArray(title.props.style)
        ? Object.assign({}, ...title.props.style)
        : title.props.style;
      expect(styles.fontFamily).toBe(typography.headingFamily);
    });

    it('subtitle uses body fontFamily', () => {
      const { getByTestId } = renderScreen();
      const subtitle = getByTestId('store-locator-subtitle');
      const styles = Array.isArray(subtitle.props.style)
        ? Object.assign({}, ...subtitle.props.style)
        : subtitle.props.style;
      expect(styles.fontFamily).toBe(typography.bodyFamily);
    });
  });

  describe('interaction', () => {
    it('calls onStorePress when store card tapped', () => {
      const onStorePress = jest.fn();
      const { getByTestId } = renderScreen({ onStorePress });
      fireEvent.press(getByTestId('store-card-store-asheville'));
      expect(onStorePress).toHaveBeenCalledWith(expect.objectContaining({ id: 'store-asheville' }));
    });
  });
});
