import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// TDD: Tests written before implementation
// Component will be at: @/components/CategoryCard
// import { CategoryCard } from '@/components/CategoryCard';

// Placeholder until component exists
const CategoryCard = (props: any) => {
  throw new Error('CategoryCard component not yet implemented');
};

const mockCategory = {
  id: 'cat-001',
  title: 'Living Room Futons',
  image: 'https://example.com/category-living.jpg',
};

describe('CategoryCard', () => {
  describe('rendering', () => {
    it('renders category title', () => {
      const { getByText } = render(<CategoryCard category={mockCategory} onPress={() => {}} />);
      expect(getByText('Living Room Futons')).toBeTruthy();
    });

    it('renders hero image', () => {
      const { getByTestId } = render(
        <CategoryCard category={mockCategory} onPress={() => {}} testID="category-card" />,
      );
      expect(getByTestId('category-card-image')).toBeTruthy();
    });

    it('renders with testID for automation', () => {
      const { getByTestId } = render(
        <CategoryCard category={mockCategory} onPress={() => {}} testID="cat-card" />,
      );
      expect(getByTestId('cat-card')).toBeTruthy();
    });
  });

  describe('styling', () => {
    it('renders with overlay gradient on image', () => {
      const { getByTestId } = render(
        <CategoryCard category={mockCategory} onPress={() => {}} testID="category-card" />,
      );
      // Title should be readable over image (overlay exists)
      expect(getByTestId('category-card-overlay')).toBeTruthy();
    });

    it('renders title in correct position over image', () => {
      const { getByText } = render(<CategoryCard category={mockCategory} onPress={() => {}} />);
      const title = getByText('Living Room Futons');
      expect(title).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('calls onPress with category when tapped', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <CategoryCard category={mockCategory} onPress={onPress} testID="category-card" />,
      );
      fireEvent.press(getByTestId('category-card'));
      expect(onPress).toHaveBeenCalledWith(mockCategory);
    });
  });

  describe('image handling', () => {
    it('shows placeholder when image fails to load', () => {
      const { getByTestId } = render(
        <CategoryCard category={mockCategory} onPress={() => {}} testID="category-card" />,
      );
      const image = getByTestId('category-card-image');
      fireEvent(image, 'error');
      expect(getByTestId('category-card-image-placeholder')).toBeTruthy();
    });
  });

  describe('variants', () => {
    it('renders compact variant for grid layout', () => {
      const { getByTestId } = render(
        <CategoryCard
          category={mockCategory}
          onPress={() => {}}
          variant="compact"
          testID="category-card"
        />,
      );
      expect(getByTestId('category-card')).toBeTruthy();
    });

    it('renders featured variant for hero placement', () => {
      const { getByTestId } = render(
        <CategoryCard
          category={mockCategory}
          onPress={() => {}}
          variant="featured"
          testID="category-card"
        />,
      );
      expect(getByTestId('category-card')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('has accessible label with category title', () => {
      const { getByTestId } = render(
        <CategoryCard category={mockCategory} onPress={() => {}} testID="category-card" />,
      );
      const card = getByTestId('category-card');
      expect(card.props.accessibilityLabel).toContain('Living Room Futons');
    });
  });
});
