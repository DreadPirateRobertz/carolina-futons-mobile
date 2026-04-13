/**
 * Tests for StreakDangerBanner — Phase 5 / cm-a7bqj
 * Dismissible Mountain Blue warning banner shown when streak is at risk.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StreakDangerBanner } from '../StreakDangerBanner';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderBanner(visible: boolean, onDismiss = jest.fn()) {
  return render(
    <ThemeProvider>
      <StreakDangerBanner visible={visible} onDismiss={onDismiss} />
    </ThemeProvider>,
  );
}

describe('StreakDangerBanner', () => {
  describe('hidden state', () => {
    it('renders nothing when visible is false', () => {
      const { queryByTestId } = renderBanner(false);
      expect(queryByTestId('streak-danger-banner')).toBeNull();
    });
  });

  describe('visible state', () => {
    it('renders the banner when visible is true', () => {
      const { getByTestId } = renderBanner(true);
      expect(getByTestId('streak-danger-banner')).toBeTruthy();
    });

    it('shows the streak danger message', () => {
      const { getByTestId } = renderBanner(true);
      expect(getByTestId('streak-danger-message')).toBeTruthy();
    });

    it('message contains warning text', () => {
      const { getByText } = renderBanner(true);
      expect(getByText(/streak is at risk/i)).toBeTruthy();
    });

    it('message contains reminder to open tomorrow', () => {
      const { getByText } = renderBanner(true);
      expect(getByText(/open the app tomorrow/i)).toBeTruthy();
    });

    it('shows dismiss button', () => {
      const { getByTestId } = renderBanner(true);
      expect(getByTestId('streak-danger-dismiss')).toBeTruthy();
    });

    it('calls onDismiss when dismiss button is pressed', () => {
      const onDismiss = jest.fn();
      const { getByTestId } = renderBanner(true, onDismiss);
      fireEvent.press(getByTestId('streak-danger-dismiss'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('dismiss button has accessibilityRole="button"', () => {
      const { getByTestId } = renderBanner(true);
      const btn = getByTestId('streak-danger-dismiss');
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('dismiss button has an accessibilityLabel', () => {
      const { getByTestId } = renderBanner(true);
      const btn = getByTestId('streak-danger-dismiss');
      expect(btn.props.accessibilityLabel).toBeTruthy();
    });
  });
});
