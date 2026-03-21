import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VisualSearchResultsScreen } from '../VisualSearchResultsScreen';
import { PRODUCTS } from '@/data/products';
import { WishlistProvider } from '@/hooks/useWishlist';

jest.mock('@/components/ProductCard', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    ProductCard: ({
      product,
      onPress,
      testID,
    }: {
      product: { id: string; name: string };
      onPress?: () => void;
      testID?: string;
    }) =>
      React.createElement(
        TouchableOpacity,
        { testID: testID || `product-card-${product.id}`, onPress },
        React.createElement(Text, null, product.name),
      ),
  };
});

const mockNavigate = jest.fn();
const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => mockUseRoute(),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#3E2723',
      espressoLight: '#795548',
      sandBase: '#F5F0E8',
      sunsetCoral: '#FF6B47',
      mountainBlueDark: '#1565C0',
      muted: '#9E9E9E',
      white: '#FFF',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
    borderRadius: { sm: 4, md: 8, lg: 12, card: 12, button: 8 },
    typography: {},
    shadows: { card: {}, sm: {}, md: {}, lg: {} },
  }),
}));

const defaultRoute = {
  params: {
    productSlugs: [PRODUCTS[0].slug, PRODUCTS[1].slug],
    query: {
      category: 'futons',
      style: 'modern',
      colorFamily: 'neutral',
      keywords: ['sofa'],
      matchType: 'scored' as const,
    },
  },
};

const emptyRoute = {
  params: {
    productSlugs: [],
    query: {
      category: 'futons',
      style: 'modern',
      colorFamily: 'neutral',
      keywords: [],
      matchType: 'fallback' as const,
    },
  },
};

function renderScreen(props: React.ComponentProps<typeof VisualSearchResultsScreen> = {}) {
  return render(
    <WishlistProvider>
      <VisualSearchResultsScreen {...props} />
    </WishlistProvider>,
  );
}

describe('VisualSearchResultsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoute.mockReturnValue(defaultRoute);
  });

  it('renders product cards for each result', () => {
    const { getAllByTestId } = renderScreen();
    expect(getAllByTestId(/product-card/i).length).toBeGreaterThan(0);
  });

  it('shows match-reason chip under each card', () => {
    const { getAllByTestId } = renderScreen();
    expect(getAllByTestId(/match-reason/i).length).toBeGreaterThan(0);
  });

  it('shows VisualSearchEmptyState when results is empty', () => {
    mockUseRoute.mockReturnValueOnce(emptyRoute);
    const { getByTestId } = renderScreen();
    expect(getByTestId('visual-search-empty-state')).toBeTruthy();
  });

  it('"Browse All" navigates to Shop tab', () => {
    mockUseRoute.mockReturnValueOnce(emptyRoute);
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('browse-all-btn'));
    expect(mockNavigate).toHaveBeenCalledWith('Tabs', { screen: 'Shop' });
  });

  it('shows loading indicator when loading prop is true', () => {
    mockUseRoute.mockReturnValueOnce({ params: { productSlugs: [], query: null } });
    const { getByTestId } = renderScreen({ loading: true });
    expect(getByTestId('vs-loading')).toBeTruthy();
  });

  it('shows retry button when error prop is provided', () => {
    mockUseRoute.mockReturnValueOnce({ params: { productSlugs: [], query: null } });
    const mockRetry = jest.fn();
    const { getByTestId } = renderScreen({ error: 'Something went wrong', onRetry: mockRetry });
    fireEvent.press(getByTestId('vs-retry-btn'));
    expect(mockRetry).toHaveBeenCalled();
  });
});
