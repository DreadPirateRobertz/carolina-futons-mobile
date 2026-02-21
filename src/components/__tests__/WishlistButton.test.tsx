import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WishlistButton } from '../WishlistButton';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { PRODUCTS } from '@/data/products';

const product = PRODUCTS[0];

function renderButton(props: { overlay?: boolean; size?: 'sm' | 'md' | 'lg' } = {}) {
  return render(
    <ThemeProvider>
      <WishlistProvider>
        <WishlistButton product={product} {...props} />
      </WishlistProvider>
    </ThemeProvider>,
  );
}

describe('WishlistButton', () => {
  it('renders with empty heart when not in wishlist', () => {
    const { getByText } = renderButton();
    expect(getByText('♡')).toBeTruthy();
  });

  it('toggles to filled heart on press', () => {
    const { getByTestId, getByText } = renderButton();
    fireEvent.press(getByTestId(`wishlist-btn-${product.id}`));
    expect(getByText('♥')).toBeTruthy();
  });

  it('toggles back to empty heart on second press', () => {
    const { getByTestId, getByText } = renderButton();
    fireEvent.press(getByTestId(`wishlist-btn-${product.id}`));
    fireEvent.press(getByTestId(`wishlist-btn-${product.id}`));
    expect(getByText('♡')).toBeTruthy();
  });

  it('has correct testID', () => {
    const { getByTestId } = renderButton();
    expect(getByTestId(`wishlist-btn-${product.id}`)).toBeTruthy();
  });

  it('has correct accessibility label when not in wishlist', () => {
    const { getByTestId } = renderButton();
    expect(getByTestId(`wishlist-btn-${product.id}`).props.accessibilityLabel).toContain('Add');
    expect(getByTestId(`wishlist-btn-${product.id}`).props.accessibilityLabel).toContain(
      product.name,
    );
  });

  it('has correct accessibility label when in wishlist', () => {
    const { getByTestId } = renderButton();
    fireEvent.press(getByTestId(`wishlist-btn-${product.id}`));
    expect(getByTestId(`wishlist-btn-${product.id}`).props.accessibilityLabel).toContain('Remove');
  });

  it('has selected accessibility state when active', () => {
    const { getByTestId } = renderButton();
    fireEvent.press(getByTestId(`wishlist-btn-${product.id}`));
    expect(getByTestId(`wishlist-btn-${product.id}`).props.accessibilityState.selected).toBe(true);
  });

  it('renders in small size', () => {
    const { getByTestId } = renderButton({ size: 'sm' });
    expect(getByTestId(`wishlist-btn-${product.id}`)).toBeTruthy();
  });

  it('renders in large size', () => {
    const { getByTestId } = renderButton({ size: 'lg' });
    expect(getByTestId(`wishlist-btn-${product.id}`)).toBeTruthy();
  });
});
