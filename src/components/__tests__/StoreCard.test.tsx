import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { StoreCard } from '../StoreCard';
import { type Store } from '@/data/stores';

const mockStore: Store = {
  id: 'store-test',
  name: 'Carolina Futons — Test',
  address: '100 Main St',
  city: 'Asheville',
  state: 'NC',
  zip: '28801',
  phone: '8285550100',
  email: 'test@carolinafutons.com',
  latitude: 35.5946,
  longitude: -82.554,
  hours: [
    { day: 'Monday', open: '10:00', close: '18:00' },
    { day: 'Tuesday', open: '10:00', close: '18:00' },
    { day: 'Wednesday', open: '10:00', close: '18:00' },
    { day: 'Thursday', open: '10:00', close: '20:00' },
    { day: 'Friday', open: '10:00', close: '20:00' },
    { day: 'Saturday', open: '09:00', close: '18:00' },
    { day: 'Sunday', open: '12:00', close: '17:00' },
  ],
  photos: ['https://placeholder.co/600x400?text=Test'],
  features: ['Full showroom', 'Design consultation', 'Free parking'],
  description: 'Test showroom description.',
};

const renderCard = (props?: Partial<React.ComponentProps<typeof StoreCard>>) =>
  render(
    <ThemeProvider>
      <StoreCard store={mockStore} {...props} />
    </ThemeProvider>,
  );

describe('StoreCard', () => {
  it('renders store name', () => {
    const { getByText } = renderCard({ testID: 'card' });
    expect(getByText('Carolina Futons — Test')).toBeTruthy();
  });

  it('renders address', () => {
    const { getByText } = renderCard({ testID: 'card' });
    expect(getByText('100 Main St, Asheville, NC 28801')).toBeTruthy();
  });

  it('renders formatted phone number', () => {
    const { getByText } = renderCard();
    expect(getByText('(828) 555-0100')).toBeTruthy();
  });

  it('renders open/closed status badge', () => {
    const { getByTestId } = renderCard({ testID: 'card' });
    const status = getByTestId('card-status');
    expect(status).toBeTruthy();
  });

  it('renders feature chips', () => {
    const { getByText } = renderCard();
    expect(getByText('Full showroom')).toBeTruthy();
    expect(getByText('Design consultation')).toBeTruthy();
    expect(getByText('Free parking')).toBeTruthy();
  });

  it('limits feature chips to 3', () => {
    const manyFeatures: Store = {
      ...mockStore,
      features: ['A', 'B', 'C', 'D', 'E'],
    };
    const { getByText, queryByText } = render(
      <ThemeProvider>
        <StoreCard store={manyFeatures} />
      </ThemeProvider>,
    );
    expect(getByText('A')).toBeTruthy();
    expect(getByText('B')).toBeTruthy();
    expect(getByText('C')).toBeTruthy();
    expect(queryByText('D')).toBeFalsy();
  });

  it('renders distance when provided', () => {
    const { getByTestId } = renderCard({ distance: 12.5, testID: 'card' });
    expect(getByTestId('card-distance')).toBeTruthy();
  });

  it('does not render distance when not provided', () => {
    const { queryByTestId } = renderCard({ testID: 'card' });
    expect(queryByTestId('card-distance')).toBeFalsy();
  });

  it('calls onPress with store when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderCard({ onPress, testID: 'card' });
    fireEvent.press(getByTestId('card'));
    expect(onPress).toHaveBeenCalledWith(mockStore);
  });

  it('uses default testID based on store id', () => {
    const { getByTestId } = renderCard();
    expect(getByTestId('store-card-store-test')).toBeTruthy();
  });

  it('has accessibility label', () => {
    const { getByTestId } = renderCard({ testID: 'card' });
    const card = getByTestId('card');
    expect(card.props.accessibilityLabel).toContain('Carolina Futons');
    expect(card.props.accessibilityRole).toBe('button');
  });

  it('does not crash when tapped without onPress handler', () => {
    const { getByTestId } = renderCard({ testID: 'card' });
    expect(() => fireEvent.press(getByTestId('card'))).not.toThrow();
  });

  it('does not render features section when features array is empty', () => {
    const noFeatures: Store = { ...mockStore, features: [] };
    const { queryByText } = render(
      <ThemeProvider>
        <StoreCard store={noFeatures} />
      </ThemeProvider>,
    );
    expect(queryByText('Full showroom')).toBeFalsy();
  });
});
