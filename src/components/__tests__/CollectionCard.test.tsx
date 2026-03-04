import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CollectionCard } from '../CollectionCard';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { EditorialCollection } from '@/data/collections';

const mockCollection: EditorialCollection = {
  id: 'col-test',
  slug: 'test-collection',
  title: 'Test Collection',
  subtitle: 'A test subtitle',
  description: 'A test description for the collection.',
  heroImage: { uri: 'https://example.com/image.jpg', alt: 'Test image' },
  mood: ['cozy', 'warm'],
  featured: true,
  productIds: ['prod-asheville-full'],
};

function renderCard(props: Partial<React.ComponentProps<typeof CollectionCard>> = {}) {
  const onPress = jest.fn();
  const result = render(
    <ThemeProvider>
      <CollectionCard
        collection={mockCollection}
        onPress={onPress}
        testID="test-card"
        {...props}
      />
    </ThemeProvider>,
  );
  return { ...result, onPress };
}

describe('CollectionCard', () => {
  it('renders collection title', () => {
    const { getByText } = renderCard();
    expect(getByText('Test Collection')).toBeTruthy();
  });

  it('renders subtitle in featured variant', () => {
    const { getByText } = renderCard({ variant: 'featured' });
    expect(getByText('A test subtitle')).toBeTruthy();
  });

  it('renders mood tags', () => {
    const { getByText } = renderCard();
    expect(getByText('cozy')).toBeTruthy();
    expect(getByText('warm')).toBeTruthy();
  });

  it('renders item count', () => {
    const { getByText } = renderCard();
    expect(getByText('1 items')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const { getByTestId, onPress } = renderCard();
    fireEvent.press(getByTestId('test-card'));
    expect(onPress).toHaveBeenCalledWith(mockCollection);
  });

  it('has correct accessibility label', () => {
    const { getByTestId } = renderCard();
    expect(getByTestId('test-card').props.accessibilityLabel).toBe(
      'Test Collection: A test subtitle',
    );
  });
});
