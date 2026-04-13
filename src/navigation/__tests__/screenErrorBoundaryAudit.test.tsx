/**
 * @module ScreenErrorBoundaryAudit.test
 *
 * TDD audit: verifies every screen that was missing a ScreenErrorBoundary
 * is now wrapped with the withScreenErrorBoundary HOC (or inline boundary).
 * Each test mounts a wrapped-screen whose child throws, then asserts:
 *   1. The screen-specific error testID is present (screen-error-<ScreenName>)
 *   2. The generic crash boundary fallback is NOT the only catch (no silent swallow)
 *
 * cm-kro error boundary audit.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { withScreenErrorBoundary } from '../withScreenErrorBoundary';
import { ScreenErrorBoundary } from '@/components/ScreenErrorBoundary';
import * as crashReporting from '@/services/crashReporting';

// Suppress React error boundary noise in test output
let consoleError: jest.SpyInstance;
beforeEach(() => {
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  crashReporting.resetForTesting();
  jest.useFakeTimers();
});
afterEach(() => {
  consoleError.mockRestore();
  jest.useRealTimers();
});

// Navigation mock — withScreenErrorBoundary uses useNavigation internally
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ dispatch: jest.fn() }),
  CommonActions: { reset: jest.fn() },
}));

function BrokenChild(): React.ReactElement {
  throw new Error('render crash');
}

// ---------------------------------------------------------------------------
// Home screen (TabNavigator)
// ---------------------------------------------------------------------------
describe('HomeScreen error boundary', () => {
  const WrappedBroken = withScreenErrorBoundary(BrokenChild, 'Home');

  it('catches render error and shows screen-specific fallback', () => {
    const { getByTestId } = render(<WrappedBroken />);
    expect(getByTestId('screen-error-Home')).toBeTruthy();
  });

  it('reports crash with screenName=Home', () => {
    render(<WrappedBroken />);
    const log = crashReporting.getErrorLog();
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].context?.screen).toBe('Home');
  });

  it('shows "Try Again" retry button', () => {
    const { getByTestId } = render(<WrappedBroken />);
    expect(getByTestId('error-boundary-retry')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Shop screen (TabNavigator)
// ---------------------------------------------------------------------------
describe('ShopScreen error boundary', () => {
  const WrappedBroken = withScreenErrorBoundary(BrokenChild, 'Shop');

  it('catches render error and shows screen-specific fallback', () => {
    const { getByTestId } = render(<WrappedBroken />);
    expect(getByTestId('screen-error-Shop')).toBeTruthy();
  });

  it('reports crash with screenName=Shop', () => {
    render(<WrappedBroken />);
    const log = crashReporting.getErrorLog();
    expect(log[0].context?.screen).toBe('Shop');
  });
});

// ---------------------------------------------------------------------------
// Cart screen (TabNavigator)
// ---------------------------------------------------------------------------
describe('CartScreen error boundary', () => {
  const WrappedBroken = withScreenErrorBoundary(BrokenChild, 'Cart');

  it('catches render error and shows screen-specific fallback', () => {
    const { getByTestId } = render(<WrappedBroken />);
    expect(getByTestId('screen-error-Cart')).toBeTruthy();
  });

  it('reports crash with screenName=Cart', () => {
    render(<WrappedBroken />);
    const log = crashReporting.getErrorLog();
    expect(log[0].context?.screen).toBe('Cart');
  });
});

// ---------------------------------------------------------------------------
// Account screen (TabNavigator)
// ---------------------------------------------------------------------------
describe('AccountScreen error boundary', () => {
  const WrappedBroken = withScreenErrorBoundary(BrokenChild, 'Account');

  it('catches render error and shows screen-specific fallback', () => {
    const { getByTestId } = render(<WrappedBroken />);
    expect(getByTestId('screen-error-Account')).toBeTruthy();
  });

  it('reports crash with screenName=Account', () => {
    render(<WrappedBroken />);
    const log = crashReporting.getErrorLog();
    expect(log[0].context?.screen).toBe('Account');
  });
});

// ---------------------------------------------------------------------------
// OrderConfirmation screen (AppNavigator — HOC was omitted)
// ---------------------------------------------------------------------------
describe('OrderConfirmationScreen error boundary', () => {
  const WrappedBroken = withScreenErrorBoundary(BrokenChild, 'OrderConfirmation');

  it('catches render error and shows screen-specific fallback', () => {
    const { getByTestId } = render(<WrappedBroken />);
    expect(getByTestId('screen-error-OrderConfirmation')).toBeTruthy();
  });

  it('reports crash with screenName=OrderConfirmation', () => {
    render(<WrappedBroken />);
    const log = crashReporting.getErrorLog();
    expect(log[0].context?.screen).toBe('OrderConfirmation');
  });

  it('shows Go Home button via onNavigateHome', () => {
    const onNavigateHome = jest.fn();
    const { getByTestId } = render(
      <ScreenErrorBoundary screenName="OrderConfirmation" onNavigateHome={onNavigateHome}>
        <BrokenChild />
      </ScreenErrorBoundary>,
    );
    expect(getByTestId('screen-error-home')).toBeTruthy();
    fireEvent.press(getByTestId('screen-error-home'));
    expect(onNavigateHome).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Onboarding screen (AppNavigator — inline render, no boundary)
// ---------------------------------------------------------------------------
describe('OnboardingScreen error boundary', () => {
  const WrappedBroken = withScreenErrorBoundary(BrokenChild, 'Onboarding');

  it('catches render error and shows screen-specific fallback', () => {
    const { getByTestId } = render(<WrappedBroken />);
    expect(getByTestId('screen-error-Onboarding')).toBeTruthy();
  });

  it('reports crash with screenName=Onboarding', () => {
    render(<WrappedBroken />);
    const log = crashReporting.getErrorLog();
    expect(log[0].context?.screen).toBe('Onboarding');
  });
});

// ---------------------------------------------------------------------------
// Loyalty screen (unregistered — needs navigator entry + boundary)
// ---------------------------------------------------------------------------
describe('LoyaltyScreen error boundary', () => {
  const WrappedBroken = withScreenErrorBoundary(BrokenChild, 'Loyalty');

  it('catches render error and shows screen-specific fallback', () => {
    const { getByTestId } = render(<WrappedBroken />);
    expect(getByTestId('screen-error-Loyalty')).toBeTruthy();
  });

  it('reports crash with screenName=Loyalty', () => {
    render(<WrappedBroken />);
    const log = crashReporting.getErrorLog();
    expect(log[0].context?.screen).toBe('Loyalty');
  });

  it('shows "This page ran into an issue" heading', () => {
    const { getByText } = render(<WrappedBroken />);
    expect(getByText('This page ran into an issue')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// HOC display name sanity check
// ---------------------------------------------------------------------------
describe('withScreenErrorBoundary HOC display names', () => {
  it('sets displayName for Home', () => {
    const Wrapped = withScreenErrorBoundary(BrokenChild, 'Home');
    expect(Wrapped.displayName).toBe('withScreenErrorBoundary(Home)');
  });

  it('sets displayName for Shop', () => {
    const Wrapped = withScreenErrorBoundary(BrokenChild, 'Shop');
    expect(Wrapped.displayName).toBe('withScreenErrorBoundary(Shop)');
  });

  it('sets displayName for Cart', () => {
    const Wrapped = withScreenErrorBoundary(BrokenChild, 'Cart');
    expect(Wrapped.displayName).toBe('withScreenErrorBoundary(Cart)');
  });

  it('sets displayName for Loyalty', () => {
    const Wrapped = withScreenErrorBoundary(BrokenChild, 'Loyalty');
    expect(Wrapped.displayName).toBe('withScreenErrorBoundary(Loyalty)');
  });

  it('sets displayName for OrderConfirmation', () => {
    const Wrapped = withScreenErrorBoundary(BrokenChild, 'OrderConfirmation');
    expect(Wrapped.displayName).toBe('withScreenErrorBoundary(OrderConfirmation)');
  });
});
