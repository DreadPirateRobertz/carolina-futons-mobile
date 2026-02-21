import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { Header } from '../Header';

describe('Header', () => {
  describe('rendering', () => {
    it('renders the logo', () => {
      const { getByTestId } = render(<Header testID="header" />);
      expect(getByTestId('header-logo')).toBeTruthy();
    });

    it('renders search icon/button', () => {
      const { getByTestId } = render(<Header testID="header" />);
      expect(getByTestId('header-search')).toBeTruthy();
    });

    it('renders cart icon', () => {
      const { getByTestId } = render(<Header testID="header" />);
      expect(getByTestId('header-cart')).toBeTruthy();
    });
  });

  describe('cart badge', () => {
    it('shows cart count when items in cart', () => {
      const { getByText } = render(<Header cartCount={3} testID="header" />);
      expect(getByText('3')).toBeTruthy();
    });

    it('hides cart badge when count is 0', () => {
      const { queryByTestId } = render(<Header cartCount={0} testID="header" />);
      expect(queryByTestId('header-cart-badge')).toBeFalsy();
    });

    it('shows 99+ when cart count exceeds 99', () => {
      const { getByText } = render(<Header cartCount={150} testID="header" />);
      expect(getByText('99+')).toBeTruthy();
    });

    it('hides cart badge when cartCount is undefined', () => {
      const { queryByTestId } = render(<Header testID="header" />);
      expect(queryByTestId('header-cart-badge')).toBeFalsy();
    });
  });

  describe('search interaction', () => {
    it('calls onSearchPress when search icon is tapped', () => {
      const onSearchPress = jest.fn();
      const { getByTestId } = render(<Header onSearchPress={onSearchPress} testID="header" />);
      fireEvent.press(getByTestId('header-search'));
      expect(onSearchPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('cart interaction', () => {
    it('calls onCartPress when cart icon is tapped', () => {
      const onCartPress = jest.fn();
      const { getByTestId } = render(<Header onCartPress={onCartPress} testID="header" />);
      fireEvent.press(getByTestId('header-cart'));
      expect(onCartPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('back navigation', () => {
    it('shows back button when showBack is true', () => {
      const { getByTestId } = render(<Header showBack testID="header" />);
      expect(getByTestId('header-back')).toBeTruthy();
    });

    it('hides back button by default', () => {
      const { queryByTestId } = render(<Header testID="header" />);
      expect(queryByTestId('header-back')).toBeFalsy();
    });

    it('calls onBackPress when back button is tapped', () => {
      const onBackPress = jest.fn();
      const { getByTestId } = render(<Header showBack onBackPress={onBackPress} testID="header" />);
      fireEvent.press(getByTestId('header-back'));
      expect(onBackPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('title', () => {
    it('shows custom title when provided', () => {
      const { getByText } = render(<Header title="All Futons" testID="header" />);
      expect(getByText('All Futons')).toBeTruthy();
    });

    it('shows logo when no title is provided', () => {
      const { getByTestId, queryByTestId } = render(<Header testID="header" />);
      expect(getByTestId('header-logo')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('cart button has accessible label with count', () => {
      const { getByTestId } = render(<Header cartCount={5} testID="header" />);
      const cart = getByTestId('header-cart');
      expect(cart.props.accessibilityLabel).toContain('5');
    });

    it('search button has accessible label', () => {
      const { getByTestId } = render(<Header testID="header" />);
      const search = getByTestId('header-search');
      expect(search.props.accessibilityLabel).toBeTruthy();
    });
  });
});
