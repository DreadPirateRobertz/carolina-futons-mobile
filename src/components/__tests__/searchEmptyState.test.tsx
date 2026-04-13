import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchEmptyState } from '../SearchEmptyState';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { CATEGORIES } from '@/data/products';

function renderEmpty(props: Partial<React.ComponentProps<typeof SearchEmptyState>> = {}) {
  const defaultProps = {
    query: 'floral couch',
    categories: CATEGORIES,
    onCategoryPress: jest.fn(),
    onTrendingPress: jest.fn(),
    ...props,
  };
  return {
    ...render(
      <ThemeProvider>
        <SearchEmptyState {...defaultProps} />
      </ThemeProvider>,
    ),
    onCategoryPress: defaultProps.onCategoryPress,
    onTrendingPress: defaultProps.onTrendingPress,
  };
}

describe('SearchEmptyState', () => {
  describe('Rendering', () => {
    it('renders with default testID', () => {
      const { getByTestId } = renderEmpty();
      expect(getByTestId('search-empty-state')).toBeTruthy();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = renderEmpty({ testID: 'custom-empty' });
      expect(getByTestId('custom-empty')).toBeTruthy();
    });

    it('shows no results message with search query', () => {
      const { getByText } = renderEmpty({ query: 'purple ottoman' });
      expect(getByText(/no results/i)).toBeTruthy();
      expect(getByText(/purple ottoman/i)).toBeTruthy();
    });

    it('shows search illustration', () => {
      const { getByTestId } = renderEmpty();
      expect(getByTestId('search-empty-illustration')).toBeTruthy();
    });

    it('shows suggestion prompt text', () => {
      const { getByText } = renderEmpty();
      expect(getByText(/try browsing/i)).toBeTruthy();
    });
  });

  describe('Category Chips', () => {
    it('renders category suggestion chips', () => {
      const { getByTestId } = renderEmpty();
      for (const cat of CATEGORIES) {
        expect(getByTestId(`category-chip-${cat.id}`)).toBeTruthy();
      }
    });

    it('shows category labels on chips', () => {
      const { getByText } = renderEmpty();
      for (const cat of CATEGORIES) {
        expect(getByText(cat.label)).toBeTruthy();
      }
    });

    it('calls onCategoryPress with category id when chip tapped', () => {
      const { getByTestId, onCategoryPress } = renderEmpty();
      fireEvent.press(getByTestId('category-chip-futons'));
      expect(onCategoryPress).toHaveBeenCalledWith('futons');
    });

    it('calls onCategoryPress for different categories', () => {
      const { getByTestId, onCategoryPress } = renderEmpty();
      fireEvent.press(getByTestId('category-chip-murphy-beds'));
      expect(onCategoryPress).toHaveBeenCalledWith('murphy-beds');
      fireEvent.press(getByTestId('category-chip-covers'));
      expect(onCategoryPress).toHaveBeenCalledWith('covers');
    });

    it('chips have button accessibility role', () => {
      const { getByTestId } = renderEmpty();
      const chip = getByTestId('category-chip-futons');
      expect(chip.props.accessibilityRole).toBe('button');
    });

    it('chips have accessibility label with category name', () => {
      const { getByTestId } = renderEmpty();
      const chip = getByTestId('category-chip-futons');
      expect(chip.props.accessibilityLabel).toContain('Futons');
    });
  });

  describe('Trending Products', () => {
    it('renders trending section', () => {
      const { getByTestId } = renderEmpty();
      expect(getByTestId('trending-section')).toBeTruthy();
    });

    it('shows trending header text', () => {
      const { getByText } = renderEmpty();
      expect(getByText(/trending/i)).toBeTruthy();
    });

    it('renders trending product chips', () => {
      const { getByTestId } = renderEmpty();
      expect(getByTestId('trending-chip-0')).toBeTruthy();
    });

    it('calls onTrendingPress with correct term when trending chip tapped', () => {
      const { getByTestId, onTrendingPress } = renderEmpty();
      fireEvent.press(getByTestId('trending-chip-0'));
      expect(onTrendingPress).toHaveBeenCalledWith('futon mattress');
    });

    it('renders all trending chips', () => {
      const { getByTestId } = renderEmpty();
      for (let i = 0; i < 5; i++) {
        expect(getByTestId(`trending-chip-${i}`)).toBeTruthy();
      }
    });
  });

  describe('Accessibility', () => {
    it('container has accessibility label', () => {
      const { getByTestId } = renderEmpty({ query: 'bean bag' });
      const container = getByTestId('search-empty-state');
      expect(container.props.accessibilityLabel).toContain('No results');
    });

    it('chips section has accessible header', () => {
      const { getByText } = renderEmpty();
      const header = getByText(/try browsing/i);
      expect(header).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty query string with fallback message', () => {
      const { getByTestId, getByText } = renderEmpty({ query: '' });
      expect(getByTestId('search-empty-state')).toBeTruthy();
      expect(getByText('No results found')).toBeTruthy();
    });

    it('empty query accessibility label matches title text', () => {
      const { getByTestId } = renderEmpty({ query: '' });
      const container = getByTestId('search-empty-state');
      expect(container.props.accessibilityLabel).toBe('No results found');
    });

    it('handles query with special characters', () => {
      const { getByText } = renderEmpty({ query: 'couch & table <b>' });
      expect(getByText(/couch & table/)).toBeTruthy();
    });

    it('renders with empty categories array', () => {
      const { getByTestId, queryByTestId } = renderEmpty({ categories: [] });
      expect(getByTestId('search-empty-state')).toBeTruthy();
      expect(queryByTestId('category-chip-futons')).toBeNull();
    });
  });
});
