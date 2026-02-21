import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HomeScreen } from '../HomeScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderHomeScreen(props: { onOpenAR?: () => void } = {}) {
  return render(
    <ThemeProvider>
      <HomeScreen {...props} />
    </ThemeProvider>,
  );
}

describe('HomeScreen', () => {
  it('renders welcome text', () => {
    const { getByText } = renderHomeScreen();
    expect(getByText('Welcome to Carolina Futons')).toBeTruthy();
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
});
