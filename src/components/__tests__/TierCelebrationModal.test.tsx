/**
 * Tests for TierCelebrationModal — Phase 5
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { TierCelebrationModal } from '../TierCelebrationModal';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { LoyaltyTier } from '@/hooks/useLoyalty';

function renderModal(newTier: LoyaltyTier | null, onDismiss = jest.fn()) {
  return render(
    <ThemeProvider>
      <TierCelebrationModal newTier={newTier} onDismiss={onDismiss} />
    </ThemeProvider>,
  );
}

describe('TierCelebrationModal', () => {
  describe('null / hidden state', () => {
    it('renders nothing when newTier is null', () => {
      const { queryByTestId } = renderModal(null);
      expect(queryByTestId('tier-celebration-modal')).toBeNull();
    });
  });

  describe('silver tier-up', () => {
    it('renders the modal when newTier is silver', () => {
      const { getByTestId } = renderModal('silver');
      expect(getByTestId('tier-celebration-modal')).toBeTruthy();
    });

    it('shows "Silver" tier label', () => {
      const { getByText } = renderModal('silver');
      expect(getByText(/Silver/i)).toBeTruthy();
    });

    it('shows congratulations heading', () => {
      const { getByTestId } = renderModal('silver');
      expect(getByTestId('tier-celebration-heading')).toBeTruthy();
    });

    it('shows tier badge element', () => {
      const { getByTestId } = renderModal('silver');
      expect(getByTestId('tier-celebration-badge')).toBeTruthy();
    });

    it('shows confetti container', () => {
      const { getByTestId } = renderModal('silver');
      expect(getByTestId('tier-celebration-confetti')).toBeTruthy();
    });

    it('shows dismiss button', () => {
      const { getByTestId } = renderModal('silver');
      expect(getByTestId('tier-celebration-dismiss')).toBeTruthy();
    });

    it('calls onDismiss when dismiss button is pressed', () => {
      const onDismiss = jest.fn();
      const { getByTestId } = renderModal('silver', onDismiss);
      fireEvent.press(getByTestId('tier-celebration-dismiss'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('gold tier-up', () => {
    it('renders the modal when newTier is gold', () => {
      const { getByTestId } = renderModal('gold');
      expect(getByTestId('tier-celebration-modal')).toBeTruthy();
    });

    it('shows "Gold" tier label', () => {
      const { getByText } = renderModal('gold');
      expect(getByText(/Gold/i)).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('dismiss button has accessibilityRole="button"', () => {
      const { getByTestId } = renderModal('silver');
      const btn = getByTestId('tier-celebration-dismiss');
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('modal has accessibilityViewIsModal', () => {
      const { getByTestId } = renderModal('silver');
      const modal = getByTestId('tier-celebration-modal');
      expect(modal.props.accessibilityViewIsModal).toBe(true);
    });

    it('renders without crash when reduced motion is enabled', () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      expect(() => renderModal('gold')).not.toThrow();
      jest.restoreAllMocks();
    });

    it('confetti is hidden when reduced motion is enabled', async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      const { queryByTestId } = renderModal('gold');
      // Wait for the async isReduceMotionEnabled to resolve and state to update
      await waitFor(() =>
        expect(queryByTestId('tier-celebration-confetti')).toBeNull(),
      );
      jest.restoreAllMocks();
    });
  });
});
