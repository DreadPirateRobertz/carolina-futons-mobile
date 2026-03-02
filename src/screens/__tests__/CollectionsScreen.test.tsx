import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { CollectionsScreen } from '../CollectionsScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderCollectionsScreen() {
  return render(
    <NavigationContainer>
      <ThemeProvider>
        <CollectionsScreen />
      </ThemeProvider>
    </NavigationContainer>,
  );
}

describe('CollectionsScreen', () => {
  it('renders screen with testID', () => {
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('collections-screen')).toBeTruthy();
  });

  it('renders Shop the Look header', () => {
    const { getByText } = renderCollectionsScreen();
    expect(getByText('Shop the Look')).toBeTruthy();
  });

  it('renders collection cards', () => {
    const { getByTestId } = renderCollectionsScreen();
    expect(getByTestId('collection-card-mountain-lodge-living')).toBeTruthy();
  });
});
