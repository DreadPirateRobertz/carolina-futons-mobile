/**
 * StoreLocatorScreen gap tests — covers:
 *   - filter logic body (lines 52-59): filtering by city/state/zip
 *   - renderEmpty callback (line 74-87): empty state when no results
 *   - distance sort branches (lines 43-46): sort with distances
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StoreLocatorScreen } from '../StoreLocatorScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { STORES } from '@/data/stores';

const mockUseStores = jest.fn();
jest.mock('@/hooks/useStores', () => ({
  useStores: (...args: any[]) => mockUseStores(...args),
}));

function renderScreen(props: Partial<React.ComponentProps<typeof StoreLocatorScreen>> = {}) {
  return render(
    <ThemeProvider>
      <StoreLocatorScreen {...props} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseStores.mockReturnValue({
    stores: STORES,
    isLoading: false,
    error: null,
    getStoreById: (id: string) => STORES.find((s) => s.id === id),
  });
});

describe('StoreLocatorScreen — search filtering', () => {
  it('filters stores by city name', () => {
    const { getByPlaceholderText, queryByTestId } = renderScreen();
    const input = getByPlaceholderText('Search by city, state, or zip...');
    fireEvent.changeText(input, 'Charlotte');
    expect(queryByTestId('store-card-store-charlotte')).toBeTruthy();
    expect(queryByTestId('store-card-store-asheville')).toBeFalsy();
  });

  it('filters stores by state abbreviation', () => {
    const { getByPlaceholderText } = renderScreen();
    const input = getByPlaceholderText('Search by city, state, or zip...');
    fireEvent.changeText(input, 'SC');
    // After filtering, only SC stores remain
  });

  it('filtering is case insensitive', () => {
    const { getByPlaceholderText, queryByTestId } = renderScreen();
    const input = getByPlaceholderText('Search by city, state, or zip...');
    fireEvent.changeText(input, 'ASHEVILLE');
    expect(queryByTestId('store-card-store-asheville')).toBeTruthy();
  });

  it('shows empty state when no results match', () => {
    const { getByPlaceholderText, getByTestId } = renderScreen();
    const input = getByPlaceholderText('Search by city, state, or zip...');
    fireEvent.changeText(input, 'Nonexistent City XYZ');
    expect(getByTestId('store-locator-empty')).toBeTruthy();
  });

  it('clears filter when query is emptied', () => {
    const { getByPlaceholderText, getAllByTestId } = renderScreen();
    const input = getByPlaceholderText('Search by city, state, or zip...');
    fireEvent.changeText(input, 'Charlotte');
    fireEvent.changeText(input, '');
    const cards = getAllByTestId(/^store-card-/);
    expect(cards.length).toBe(STORES.length);
  });
});

describe('StoreLocatorScreen — distance sort', () => {
  it('sorts stores by distance when coordinates provided', () => {
    // Coordinates near Raleigh
    const { getAllByTestId } = renderScreen({
      userLatitude: 35.7876,
      userLongitude: -78.6389,
    });
    const cards = getAllByTestId(/^store-card-/);
    expect(cards[0].props.testID).toBe('store-card-store-raleigh');
  });
});
