import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { HomeScreen } from '../HomeScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderHomeScreen(props: { onOpenAR?: () => void; onOpenShop?: () => void; onCollectionPress?: (c: any) => void } = {}) {
  return render(
    <NavigationContainer>
      <ThemeProvider>
        <HomeScreen {...props} />
      </ThemeProvider>
    </NavigationContainer>,
  );
}

describe('HomeScreen', () => {
  it('renders hero content', () => {
    const { getByText } = renderHomeScreen();
    expect(getByText('Handcrafted in NC')).toBeTruthy();
    expect(getByText(/Carolina/)).toBeTruthy();
    expect(getByText('Handcrafted comfort from the Blue Ridge Mountains')).toBeTruthy();
  });

  it('has testID for screen identification', () => {
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('home-screen')).toBeTruthy();
  });

  it('renders AR CTA button', () => {
    const { getByTestId, getByText } = renderHomeScreen();
    expect(getByTestId('home-ar-button')).toBeTruthy();
    expect(getByText('Try in Your Room')).toBeTruthy();
    expect(getByText('See how our futons fit using your camera')).toBeTruthy();
  });

  it('calls onOpenAR when AR button pressed', () => {
    const onOpenAR = jest.fn();
    const { getByTestId } = renderHomeScreen({ onOpenAR });
    fireEvent.press(getByTestId('home-ar-button'));
    expect(onOpenAR).toHaveBeenCalledTimes(1);
  });

  it('AR button does not crash when onOpenAR not provided', () => {
    const { getByTestId } = renderHomeScreen();
    // Should not throw
    fireEvent.press(getByTestId('home-ar-button'));
  });

  it('AR button has correct accessibility attributes', () => {
    const { getByTestId } = renderHomeScreen();
    const btn = getByTestId('home-ar-button');
    expect(btn.props.accessibilityLabel).toBe('Try futons in your room with AR camera');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('renders Shop CTA button', () => {
    const { getByTestId, getByText } = renderHomeScreen();
    expect(getByTestId('home-shop-button')).toBeTruthy();
    expect(getByText('Browse Products')).toBeTruthy();
    expect(getByText('Futons, covers, mattresses & more')).toBeTruthy();
  });

  it('calls onOpenShop when Shop button pressed', () => {
    const onOpenShop = jest.fn();
    const { getByTestId } = renderHomeScreen({ onOpenShop });
    fireEvent.press(getByTestId('home-shop-button'));
    expect(onOpenShop).toHaveBeenCalledTimes(1);
  });

  it('Shop button does not crash when onOpenShop not provided', () => {
    const { getByTestId } = renderHomeScreen();
    fireEvent.press(getByTestId('home-shop-button'));
  });

  it('Shop button has correct accessibility', () => {
    const { getByTestId } = renderHomeScreen();
    const btn = getByTestId('home-shop-button');
    expect(btn.props.accessibilityLabel).toBe('Browse our products');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('renders collection carousel section with header', () => {
    const { getByText, getByTestId } = renderHomeScreen();
    expect(getByText('Shop the Look')).toBeTruthy();
    expect(getByTestId('collection-carousel')).toBeTruthy();
  });

  it('renders featured collection cards in carousel', () => {
    const { getByText } = renderHomeScreen();
    expect(getByText('Mountain Lodge Living')).toBeTruthy();
    expect(getByText('Guest Room Ready')).toBeTruthy();
  });

  it('calls onCollectionPress when collection card tapped', () => {
    const onCollectionPress = jest.fn();
    const { getByText } = renderHomeScreen({ onCollectionPress });
    fireEvent.press(getByText('Mountain Lodge Living'));
    expect(onCollectionPress).toHaveBeenCalledTimes(1);
    expect(onCollectionPress).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'mountain-lodge-living' }),
    );
  });
});
