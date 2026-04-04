/**
 * TDD tests for PriceAlertButton component.
 *
 * Behaviour:
 *  - Renders "Alert me when price drops" label when not subscribed
 *  - Renders "Price alert on" label when subscribed
 *  - Shows loading indicator while isLoading=true; button disabled
 *  - Pressing when unsubscribed calls subscribe()
 *  - Pressing when subscribed calls unsubscribe()
 *  - Shows error message when error is set
 *  - Accessible: accessibilityRole=button, descriptive accessibilityLabel
 *
 * @bead cm-pda
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PriceAlertButton } from '../PriceAlertButton';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ── Mock usePriceAlertSubscription ────────────────────────────────────────────

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
let mockHookState = {
  isSubscribed: false,
  isLoading: false,
  error: null as string | null,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
};

jest.mock('@/hooks/usePriceAlertSubscription', () => ({
  usePriceAlertSubscription: () => mockHookState,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderButton(
  props: Partial<React.ComponentProps<typeof PriceAlertButton>> = {},
) {
  return render(
    <ThemeProvider>
      <PriceAlertButton
        productId="asheville-full"
        productSlug="asheville-full"
        currentPrice={549}
        {...props}
      />
    </ThemeProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PriceAlertButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHookState = {
      isSubscribed: false,
      isLoading: false,
      error: null,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
    };
  });

  // ── Unsubscribed state ──────────────────────────────────────────────────��────

  describe('unsubscribed state', () => {
    it('renders "Alert me when price drops" label', () => {
      const { getByText } = renderButton();
      expect(getByText(/alert me when price drops/i)).toBeTruthy();
    });

    it('is not disabled when not loading', () => {
      const { getByTestId } = renderButton();
      expect(getByTestId('price-alert-button').props.accessibilityState?.disabled).toBeFalsy();
    });

    it('calls subscribe() when pressed', () => {
      const { getByTestId } = renderButton();
      fireEvent.press(getByTestId('price-alert-button'));
      expect(mockSubscribe).toHaveBeenCalledTimes(1);
      expect(mockUnsubscribe).not.toHaveBeenCalled();
    });
  });

  // ── Subscribed state ─────────────────────────────────────────────────────────

  describe('subscribed state', () => {
    beforeEach(() => {
      mockHookState = { ...mockHookState, isSubscribed: true };
    });

    it('renders "Price alert on" label when subscribed', () => {
      const { getByText } = renderButton();
      expect(getByText(/price alert on/i)).toBeTruthy();
    });

    it('calls unsubscribe() when pressed while subscribed', () => {
      const { getByTestId } = renderButton();
      fireEvent.press(getByTestId('price-alert-button'));
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      expect(mockSubscribe).not.toHaveBeenCalled();
    });
  });

  // ── Loading state ────────────────────────────────────────────────────────────

  describe('loading state', () => {
    beforeEach(() => {
      mockHookState = { ...mockHookState, isLoading: true };
    });

    it('shows a loading indicator while isLoading=true', () => {
      const { getByTestId } = renderButton();
      expect(getByTestId('price-alert-loading')).toBeTruthy();
    });

    it('disables the button while loading', () => {
      const { getByTestId } = renderButton();
      expect(getByTestId('price-alert-button').props.accessibilityState?.disabled).toBe(true);
    });

    it('does not call subscribe/unsubscribe when pressed while loading', () => {
      const { getByTestId } = renderButton();
      fireEvent.press(getByTestId('price-alert-button'));
      expect(mockSubscribe).not.toHaveBeenCalled();
      expect(mockUnsubscribe).not.toHaveBeenCalled();
    });
  });

  // ── Error state ───────────────────────────────────────────────────────────────

  describe('error state', () => {
    it('shows error message when error is set', () => {
      mockHookState = { ...mockHookState, error: 'Failed to subscribe. Please try again.' };
      const { getByTestId } = renderButton();
      expect(getByTestId('price-alert-error')).toBeTruthy();
    });

    it('does not show error element when error is null', () => {
      const { queryByTestId } = renderButton();
      expect(queryByTestId('price-alert-error')).toBeNull();
    });
  });

  // ── Accessibility ─────────────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('has accessibilityRole=button', () => {
      const { getByTestId } = renderButton();
      expect(getByTestId('price-alert-button').props.accessibilityRole).toBe('button');
    });

    it('has descriptive accessibilityLabel when unsubscribed', () => {
      const { getByTestId } = renderButton();
      const label = getByTestId('price-alert-button').props.accessibilityLabel;
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });

    it('has descriptive accessibilityLabel when subscribed', () => {
      mockHookState = { ...mockHookState, isSubscribed: true };
      const { getByTestId } = renderButton();
      const label = getByTestId('price-alert-button').props.accessibilityLabel;
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });
  });

  // ── Custom testID ────────────────────────────────────────────────────────────

  describe('custom testID', () => {
    it('supports custom testID prop', () => {
      const { getByTestId } = renderButton({ testID: 'my-alert-btn' });
      expect(getByTestId('my-alert-btn')).toBeTruthy();
    });
  });
});
