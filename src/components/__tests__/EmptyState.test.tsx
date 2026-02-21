import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  describe('rendering', () => {
    it('renders title', () => {
      const { getByText } = render(<EmptyState title="No Items" message="Your cart is empty" />);
      expect(getByText('No Items')).toBeTruthy();
    });

    it('renders message', () => {
      const { getByText } = render(<EmptyState title="No Items" message="Your cart is empty" />);
      expect(getByText('Your cart is empty')).toBeTruthy();
    });

    it('renders icon when provided', () => {
      const { getByTestId } = render(
        <EmptyState
          title="No Items"
          message="Your cart is empty"
          icon="cart"
          testID="empty-state"
        />,
      );
      expect(getByTestId('empty-state-icon')).toBeTruthy();
    });
  });

  describe('action button', () => {
    it('renders action button when action prop provided', () => {
      const { getByText } = render(
        <EmptyState
          title="No Results"
          message="Try a different search"
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
          message="Try a different search"
          action={{ label: 'Browse All', onPress }}
        />,
      );
      fireEvent.press(getByText('Browse All'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not render action button when no action prop', () => {
      const { queryByTestId } = render(
        <EmptyState title="No Items" message="Your cart is empty" testID="empty-state" />,
      );
      expect(queryByTestId('empty-state-action')).toBeFalsy();
    });
  });
});
