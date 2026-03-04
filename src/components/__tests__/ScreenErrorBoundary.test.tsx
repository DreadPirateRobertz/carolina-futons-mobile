import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ScreenErrorBoundary } from '../ScreenErrorBoundary';
import * as crashReporting from '@/services/crashReporting';

function BrokenComponent(): React.ReactElement {
  throw new Error('Screen crashed!');
}

function WorkingComponent() {
  return (
    <View testID="working">
      <Text>Works fine</Text>
    </View>
  );
}

let consoleError: jest.SpyInstance;
beforeEach(() => {
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  crashReporting.resetForTesting();
});
afterEach(() => {
  consoleError.mockRestore();
});

describe('ScreenErrorBoundary', () => {
  it('renders children when no error', () => {
    const { getByTestId } = render(
      <ScreenErrorBoundary screenName="TestScreen">
        <WorkingComponent />
      </ScreenErrorBoundary>,
    );
    expect(getByTestId('working')).toBeTruthy();
  });

  it('renders fallback UI with screen-specific testID when child throws', () => {
    const { getByText, getByTestId } = render(
      <ScreenErrorBoundary screenName="ProductDetail">
        <BrokenComponent />
      </ScreenErrorBoundary>,
    );
    expect(getByText('This page ran into an issue')).toBeTruthy();
    expect(getByTestId('screen-error-ProductDetail')).toBeTruthy();
  });

  it('reports error to crash reporting with screen context', () => {
    render(
      <ScreenErrorBoundary screenName="Checkout">
        <BrokenComponent />
      </ScreenErrorBoundary>,
    );
    const log = crashReporting.getErrorLog();
    expect(log).toHaveLength(1);
    expect(log[0].error.message).toBe('Screen crashed!');
    expect(log[0].severity).toBe('error');
    expect(log[0].context?.screen).toBe('Checkout');
  });

  it('adds breadcrumb on screen crash', () => {
    render(
      <ScreenErrorBoundary screenName="Cart">
        <BrokenComponent />
      </ScreenErrorBoundary>,
    );
    const crumbs = crashReporting.getBreadcrumbs();
    expect(crumbs.some((c) => c.message.includes('Screen crash: Cart'))).toBe(true);
  });

  it('renders retry button', () => {
    const { getByTestId } = render(
      <ScreenErrorBoundary screenName="Test">
        <BrokenComponent />
      </ScreenErrorBoundary>,
    );
    expect(getByTestId('screen-error-retry')).toBeTruthy();
  });

  it('renders Go Home button when onNavigateHome provided', () => {
    const onNavigateHome = jest.fn();
    const { getByTestId } = render(
      <ScreenErrorBoundary screenName="Test" onNavigateHome={onNavigateHome}>
        <BrokenComponent />
      </ScreenErrorBoundary>,
    );
    expect(getByTestId('screen-error-home')).toBeTruthy();
  });

  it('does not render Go Home button when onNavigateHome not provided', () => {
    const { queryByTestId } = render(
      <ScreenErrorBoundary screenName="Test">
        <BrokenComponent />
      </ScreenErrorBoundary>,
    );
    expect(queryByTestId('screen-error-home')).toBeNull();
  });

  it('calls onNavigateHome when Go Home pressed', () => {
    const onNavigateHome = jest.fn();
    const { getByTestId } = render(
      <ScreenErrorBoundary screenName="Test" onNavigateHome={onNavigateHome}>
        <BrokenComponent />
      </ScreenErrorBoundary>,
    );
    fireEvent.press(getByTestId('screen-error-home'));
    expect(onNavigateHome).toHaveBeenCalledTimes(1);
  });

  it('retry button has correct accessibility', () => {
    const { getByTestId } = render(
      <ScreenErrorBoundary screenName="Test">
        <BrokenComponent />
      </ScreenErrorBoundary>,
    );
    const btn = getByTestId('screen-error-retry');
    expect(btn.props.accessibilityLabel).toBe('Try again');
    expect(btn.props.accessibilityRole).toBe('button');
  });
});
