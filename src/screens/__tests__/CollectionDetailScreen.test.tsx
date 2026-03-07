import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CollectionDetailScreen } from '../CollectionDetailScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';

const Stack = createNativeStackNavigator();

function renderCollectionDetail(slug: string) {
  return render(
    <NavigationContainer>
      <ThemeProvider>
        <WishlistProvider>
          <Stack.Navigator>
            <Stack.Screen
              name="CollectionDetail"
              component={CollectionDetailScreen}
              initialParams={{ slug }}
            />
          </Stack.Navigator>
        </WishlistProvider>
      </ThemeProvider>
    </NavigationContainer>,
  );
}

describe('CollectionDetailScreen', () => {
  it('renders collection detail for valid slug', () => {
    const { getByTestId, getAllByText } = renderCollectionDetail('mountain-lodge-living');
    expect(getByTestId('collection-detail-screen')).toBeTruthy();
    expect(getAllByText('Mountain Lodge Living').length).toBeGreaterThan(0);
  });

  it('renders editorial description', () => {
    const { getByText } = renderCollectionDetail('mountain-lodge-living');
    expect(getByText(/Inspired by the cozy lodges/)).toBeTruthy();
  });

  it('renders "In This Look" section header', () => {
    const { getByText } = renderCollectionDetail('mountain-lodge-living');
    expect(getByText('In This Look')).toBeTruthy();
  });

  it('renders empty state for invalid slug', () => {
    const { getByText } = renderCollectionDetail('nonexistent');
    expect(getByText('Collection not found')).toBeTruthy();
  });

  it('renders hero image with parallax container', () => {
    const { getByTestId } = renderCollectionDetail('mountain-lodge-living');
    expect(getByTestId('parallax-hero')).toBeTruthy();
  });
});
