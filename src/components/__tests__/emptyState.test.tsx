import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  describe('rendering', () => {
    it('renders title', () => {
      const { getByText } = render(<EmptyState title="No Items" subtitle="Your cart is empty" />);
      expect(getByText('No Items')).toBeTruthy();
    });

    it('renders subtitle', () => {
      const { getByText } = render(<EmptyState title="No Items" subtitle="Your cart is empty" />);
      expect(getByText('Your cart is empty')).toBeTruthy();
    });

    it('renders icon when provided', () => {
      const { getByTestId } = render(
        <EmptyState
          title="No Items"
          subtitle="Your cart is empty"
          icon="cart"
          testID="empty-state"
        />,
      );
      expect(getByTestId('empty-state-icon')).toBeTruthy();
    });

    it('renders known icon glyph for "cart"', () => {
      const { getByTestId } = render(<EmptyState title="x" subtitle="y" icon="cart" testID="es" />);
      expect(getByTestId('es-icon').props.children).toBe('🛒');
    });

    it('falls back to raw icon string for unknown keys', () => {
      const { getByTestId } = render(<EmptyState title="x" subtitle="y" icon="🐦" testID="es" />);
      expect(getByTestId('es-icon').props.children).toBe('🐦');
    });

    it('renders illustration when provided (not icon)', () => {
      const illustration = <Text testID="custom-illustration">🏔️</Text>;
      const { getByTestId, queryByTestId } = render(
        <EmptyState
          title="No Items"
          subtitle="Nothing here"
          illustration={illustration}
          icon="cart"
          testID="es"
        />,
      );
      expect(getByTestId('custom-illustration')).toBeTruthy();
      expect(queryByTestId('es-icon')).toBeNull();
    });

    it('renders with no icon and no illustration', () => {
      const { getByText } = render(<EmptyState title="Nothing" subtitle="Empty here" />);
      expect(getByText('Nothing')).toBeTruthy();
      expect(getByText('Empty here')).toBeTruthy();
    });

    it('applies testID to root view', () => {
      const { getByTestId } = render(<EmptyState title="x" subtitle="y" testID="my-empty" />);
      expect(getByTestId('my-empty')).toBeTruthy();
    });
  });

  describe('action button', () => {
    it('renders action button when action prop provided', () => {
      const { getByText } = render(
        <EmptyState
          title="No Results"
          subtitle="Try a different search"
          action={{ label: 'Browse All', onPress: jest.fn() }}
        />,
      );
      expect(getByText('Browse All')).toBeTruthy();
    });

    it('calls action.onPress when button is tapped', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <EmptyState
          title="No Results"
          subtitle="Try a different search"
          action={{ label: 'Browse All', onPress }}
        />,
      );
      fireEvent.press(getByText('Browse All'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not render action button when no action prop', () => {
      const { queryByTestId } = render(
        <EmptyState title="No Items" subtitle="Your cart is empty" testID="empty-state" />,
      );
      expect(queryByTestId('empty-state-action')).toBeNull();
    });

    it('applies testID to action button', () => {
      const { getByTestId } = render(
        <EmptyState
          title="x"
          subtitle="y"
          action={{ label: 'Go', onPress: jest.fn() }}
          testID="es"
        />,
      );
      expect(getByTestId('es-action')).toBeTruthy();
    });

    it('has accessible role "button" on action', () => {
      const { getByTestId } = render(
        <EmptyState
          title="x"
          subtitle="y"
          action={{ label: 'Shop Now', onPress: jest.fn() }}
          testID="es"
        />,
      );
      expect(getByTestId('es-action').props.accessibilityRole).toBe('button');
    });

    it('has accessibilityLabel matching action label', () => {
      const { getByTestId } = render(
        <EmptyState
          title="x"
          subtitle="y"
          action={{ label: 'Shop Now', onPress: jest.fn() }}
          testID="es"
        />,
      );
      expect(getByTestId('es-action').props.accessibilityLabel).toBe('Shop Now');
    });
  });

  describe('edge cases', () => {
    it('renders long title without crashing', () => {
      const longTitle = 'A'.repeat(200);
      const { getByText } = render(<EmptyState title={longTitle} subtitle="ok" />);
      expect(getByText(longTitle)).toBeTruthy();
    });

    it('renders long subtitle without crashing', () => {
      const longSub = 'B'.repeat(500);
      const { getByText } = render(<EmptyState title="Title" subtitle={longSub} />);
      expect(getByText(longSub)).toBeTruthy();
    });

    it('returns null for icon testID when testID not set', () => {
      const { queryByTestId } = render(<EmptyState title="x" subtitle="y" icon="cart" />);
      expect(queryByTestId('undefined-icon')).toBeNull();
    });
  });
});
