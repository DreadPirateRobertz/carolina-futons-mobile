import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VisualSearchResultsScreen } from '../VisualSearchResultsScreen';
import { PRODUCTS } from '@/data/products';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({
    params: {
      productSlugs: [PRODUCTS[0].slug, PRODUCTS[1].slug],
      query: {
        category: 'futons',
        style: 'modern',
        colorFamily: 'neutral',
        keywords: ['sofa'],
        matchType: 'scored',
      },
    },
  }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#3E2723',
      espressoLight: '#795548',
      sandBase: '#F5F0E8',
      sunsetCoral: '#FF6B47',
      white: '#FFF',
    },
    spacing: { sm: 8, md: 16, lg: 24 },
    borderRadius: { card: 12, button: 8 },
  }),
}));

describe('VisualSearchResultsScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders product cards for each result', () => {
    const { getAllByTestId } = render(<VisualSearchResultsScreen />);
    expect(getAllByTestId(/product-card/i).length).toBeGreaterThan(0);
  });

  it('shows match-reason chip under each card', () => {
    const { getAllByTestId } = render(<VisualSearchResultsScreen />);
    expect(getAllByTestId(/match-reason/i).length).toBeGreaterThan(0);
  });

  it('shows VisualSearchEmptyState when results is empty', () => {
    const { useRoute } = require('@react-navigation/native');
    (useRoute as jest.Mock).mockReturnValueOnce({
      params: {
        productSlugs: [],
        query: {
          category: 'futons',
          style: 'modern',
          colorFamily: 'neutral',
          keywords: [],
          matchType: 'fallback',
        },
      },
    });
    const { getByTestId } = render(<VisualSearchResultsScreen />);
    expect(getByTestId('visual-search-empty-state')).toBeTruthy();
  });

  it('"Browse All" navigates to Shop tab', () => {
    const { useRoute } = require('@react-navigation/native');
    (useRoute as jest.Mock).mockReturnValueOnce({
      params: {
        productSlugs: [],
        query: {
          category: 'futons',
          style: 'modern',
          colorFamily: 'neutral',
          keywords: [],
          matchType: 'fallback',
        },
      },
    });
    const { getByTestId } = render(<VisualSearchResultsScreen />);
    fireEvent.press(getByTestId('browse-all-btn'));
    expect(mockNavigate).toHaveBeenCalledWith('Tabs', { screen: 'Shop' });
  });

  it('shows loading indicator when loading prop is true', () => {
    const { useRoute } = require('@react-navigation/native');
    (useRoute as jest.Mock).mockReturnValueOnce({
      params: { productSlugs: [], query: null },
    });
    const { getByTestId } = render(<VisualSearchResultsScreen loading />);
    expect(getByTestId('vs-loading')).toBeTruthy();
  });

  it('shows retry button when error prop is provided', () => {
    const { useRoute } = require('@react-navigation/native');
    (useRoute as jest.Mock).mockReturnValueOnce({
      params: { productSlugs: [], query: null },
    });
    const mockRetry = jest.fn();
    const { getByTestId } = render(
      <VisualSearchResultsScreen error="Something went wrong" onRetry={mockRetry} />,
    );
    fireEvent.press(getByTestId('vs-retry-btn'));
    expect(mockRetry).toHaveBeenCalled();
  });
});
