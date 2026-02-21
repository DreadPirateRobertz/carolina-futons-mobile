import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

// TDD: Tests written before implementation
// Navigation will be at: @/navigation/
// import { AppNavigator } from '@/navigation/AppNavigator';
// import { TabNavigator } from '@/navigation/TabNavigator';

// Placeholder until navigation is implemented
const AppNavigator = (props: any) => {
  throw new Error('AppNavigator not yet implemented');
};
const TabNavigator = (props: any) => {
  throw new Error('TabNavigator not yet implemented');
};

// Helper to render with navigation context
const renderWithNavigation = (component: React.ReactElement) => {
  return render(
    <NavigationContainer>{component}</NavigationContainer>
  );
};

describe('Tab Navigation', () => {
  describe('tab bar rendering', () => {
    it('renders Home tab', () => {
      const { getByText } = renderWithNavigation(<TabNavigator />);
      expect(getByText('Home')).toBeTruthy();
    });

    it('renders Shop tab', () => {
      const { getByText } = renderWithNavigation(<TabNavigator />);
      expect(getByText('Shop')).toBeTruthy();
    });

    it('renders Cart tab', () => {
      const { getByText } = renderWithNavigation(<TabNavigator />);
      expect(getByText('Cart')).toBeTruthy();
    });

    it('renders Account tab', () => {
      const { getByText } = renderWithNavigation(<TabNavigator />);
      expect(getByText('Account')).toBeTruthy();
    });
  });

  describe('tab navigation', () => {
    it('starts on Home tab by default', () => {
      const { getByTestId } = renderWithNavigation(<TabNavigator />);
      expect(getByTestId('home-screen')).toBeTruthy();
    });

    it('navigates to Shop tab when tapped', async () => {
      const { getByText, getByTestId } = renderWithNavigation(<TabNavigator />);
      fireEvent.press(getByText('Shop'));
      await waitFor(() => {
        expect(getByTestId('shop-screen')).toBeTruthy();
      });
    });

    it('navigates to Cart tab when tapped', async () => {
      const { getByText, getByTestId } = renderWithNavigation(<TabNavigator />);
      fireEvent.press(getByText('Cart'));
      await waitFor(() => {
        expect(getByTestId('cart-screen')).toBeTruthy();
      });
    });

    it('navigates to Account tab when tapped', async () => {
      const { getByText, getByTestId } = renderWithNavigation(<TabNavigator />);
      fireEvent.press(getByText('Account'));
      await waitFor(() => {
        expect(getByTestId('account-screen')).toBeTruthy();
      });
    });
  });

  describe('cart badge in tab bar', () => {
    it('shows cart item count badge on Cart tab', () => {
      const { getByTestId } = renderWithNavigation(
        <TabNavigator cartItemCount={3} />
      );
      expect(getByTestId('cart-tab-badge')).toBeTruthy();
    });

    it('hides badge when cart is empty', () => {
      const { queryByTestId } = renderWithNavigation(
        <TabNavigator cartItemCount={0} />
      );
      expect(queryByTestId('cart-tab-badge')).toBeFalsy();
    });
  });
});

describe('Stack Navigation', () => {
  describe('product detail navigation', () => {
    it('navigates to product detail from product card', async () => {
      const { getByTestId } = renderWithNavigation(<AppNavigator />);
      // Find and tap a product card on the home/shop screen
      const productCard = getByTestId('product-card-futon-001');
      fireEvent.press(productCard);
      await waitFor(() => {
        expect(getByTestId('product-detail-screen')).toBeTruthy();
      });
    });

    it('shows back button on product detail screen', async () => {
      const { getByTestId } = renderWithNavigation(<AppNavigator />);
      const productCard = getByTestId('product-card-futon-001');
      fireEvent.press(productCard);
      await waitFor(() => {
        expect(getByTestId('header-back')).toBeTruthy();
      });
    });

    it('navigates back from product detail', async () => {
      const { getByTestId, queryByTestId } = renderWithNavigation(<AppNavigator />);
      const productCard = getByTestId('product-card-futon-001');
      fireEvent.press(productCard);
      await waitFor(() => {
        expect(getByTestId('product-detail-screen')).toBeTruthy();
      });
      fireEvent.press(getByTestId('header-back'));
      await waitFor(() => {
        expect(queryByTestId('product-detail-screen')).toBeFalsy();
      });
    });
  });

  describe('category navigation', () => {
    it('navigates to category listing from category card', async () => {
      const { getByTestId } = renderWithNavigation(<AppNavigator />);
      const categoryCard = getByTestId('category-card-cat-001');
      fireEvent.press(categoryCard);
      await waitFor(() => {
        expect(getByTestId('category-listing-screen')).toBeTruthy();
      });
    });
  });
});

describe('Deep Linking', () => {
  it('opens product detail from deep link', async () => {
    const linking = {
      prefixes: ['carolinafutons://'],
      config: {
        screens: {
          ProductDetail: 'product/:id',
        },
      },
    };
    const { getByTestId } = render(
      <NavigationContainer
        linking={linking}
        initialState={{
          routes: [
            {
              name: 'ProductDetail',
              params: { id: 'futon-001' },
            },
          ],
        }}
      >
        <AppNavigator />
      </NavigationContainer>
    );
    await waitFor(() => {
      expect(getByTestId('product-detail-screen')).toBeTruthy();
    });
  });
});
