import React from 'react';
import { render } from '@testing-library/react-native';
import { HomeScreen } from '@/screens/HomeScreen';
import { ShopScreen } from '@/screens/ShopScreen';
import { CartScreen } from '@/screens/CartScreen';
import { AccountScreen } from '@/screens/AccountScreen';
import { ProductDetailScreen } from '@/screens/ProductDetailScreen';
import { CategoryScreen } from '@/screens/CategoryScreen';

describe('HomeScreen', () => {
  it('renders with testID', () => {
    const { getByTestId } = render(<HomeScreen />);
    expect(getByTestId('home-screen')).toBeTruthy();
  });

  it('renders welcome title', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('Welcome to Carolina Futons')).toBeTruthy();
  });

  it('renders subtitle', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('Handcrafted comfort from the Blue Ridge Mountains')).toBeTruthy();
  });
});

describe('ShopScreen', () => {
  it('renders with testID', () => {
    const { getByTestId } = render(<ShopScreen />);
    expect(getByTestId('shop-screen')).toBeTruthy();
  });

  it('renders title', () => {
    const { getByText } = render(<ShopScreen />);
    expect(getByText('Shop')).toBeTruthy();
  });
});

describe('CartScreen', () => {
  it('renders with testID', () => {
    const { getByTestId } = render(<CartScreen />);
    expect(getByTestId('cart-screen')).toBeTruthy();
  });

  it('renders title', () => {
    const { getByText } = render(<CartScreen />);
    expect(getByText('Cart')).toBeTruthy();
  });
});

describe('AccountScreen', () => {
  it('renders with testID', () => {
    const { getByTestId } = render(<AccountScreen />);
    expect(getByTestId('account-screen')).toBeTruthy();
  });

  it('renders title', () => {
    const { getByText } = render(<AccountScreen />);
    expect(getByText('Account')).toBeTruthy();
  });
});

describe('ProductDetailScreen', () => {
  it('renders with testID', () => {
    const { getByTestId } = render(<ProductDetailScreen />);
    expect(getByTestId('product-detail-screen')).toBeTruthy();
  });

  it('renders title', () => {
    const { getByText } = render(<ProductDetailScreen />);
    expect(getByText('Product Detail')).toBeTruthy();
  });
});

describe('CategoryScreen', () => {
  it('renders with testID', () => {
    const { getByTestId } = render(<CategoryScreen />);
    expect(getByTestId('category-listing-screen')).toBeTruthy();
  });

  it('renders title', () => {
    const { getByText } = render(<CategoryScreen />);
    expect(getByText('Category')).toBeTruthy();
  });
});
