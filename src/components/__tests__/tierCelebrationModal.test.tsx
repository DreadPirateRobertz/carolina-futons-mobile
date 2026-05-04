/**
 * Tests for TierCelebrationModal — Phase 5
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { TierCelebrationModal } from '../TierCelebrationModal';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { LOYALTY_TIERS } from '@/data/loyaltyTiers';
import type { LoyaltyTierConfig } from '@/data/loyaltyTiers';

function renderModal(newTier: LoyaltyTierConfig | null, onDismiss = jest.fn()) {
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

  describe('Mountain Guide tier-up', () => {
    it('renders the modal when newTier is Mountain Guide', () => {
      const { getByTestId } = renderModal(LOYALTY_TIERS[1]);
      expect(getByTestId('tier-celebration-modal')).toBeTruthy();
    });

    it('shows "Mountain Guide" tier label', () => {
      const { getByText } = renderModal(LOYALTY_TIERS[1]);
      expect(getByText(/Mountain Guide/i)).toBeTruthy();
    });

    it('shows congratulations heading', () => {
      const { getByTestId } = renderModal(LOYALTY_TIERS[1]);
      expect(getByTestId('tier-celebration-heading')).toBeTruthy();
    });

    it('shows tier badge element', () => {
      const { getByTestId } = renderModal(LOYALTY_TIERS[1]);
      expect(getByTestId('tier-celebration-badge', { includeHiddenElements: true })).toBeTruthy();
    });

    it('shows confetti container', () => {
      const { getByTestId } = renderModal(LOYALTY_TIERS[1]);
      expect(getByTestId('tier-celebration-confetti')).toBeTruthy();
    });

    it('shows dismiss button', () => {
      const { getByTestId } = renderModal(LOYALTY_TIERS[1]);
      expect(getByTestId('tier-celebration-dismiss')).toBeTruthy();
    });

    it('calls onDismiss when dismiss button is pressed', () => {
      const onDismiss = jest.fn();
      const { getByTestId } = renderModal(LOYALTY_TIERS[1], onDismiss);
      fireEvent.press(getByTestId('tier-celebration-dismiss'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Summit Master tier-up', () => {
    it('renders the modal when newTier is Summit Master', () => {
      const { getByTestId } = renderModal(LOYALTY_TIERS[2]);
      expect(getByTestId('tier-celebration-modal')).toBeTruthy();
    });

    it('shows "Summit Master" tier label', () => {
      const { getByText } = renderModal(LOYALTY_TIERS[2]);
      expect(getByText(/Summit Master/i)).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('dismiss button has accessibilityRole="button"', () => {
      const { getByTestId } = renderModal(LOYALTY_TIERS[1]);
      const btn = getByTestId('tier-celebration-dismiss');
      expect(btn.props.accessibilityRole).toBe('button');
    });

    it('dismiss button has descriptive accessibilityLabel', () => {
      const { getByTestId } = renderModal(LOYALTY_TIERS[1]);
      const btn = getByTestId('tier-celebration-dismiss');
      expect(btn.props.accessibilityLabel).toMatch(/Mountain Guide/i);
    });

    it('heading has accessibilityRole="header"', () => {
      const { getByTestId } = renderModal(LOYALTY_TIERS[1]);
      const heading = getByTestId('tier-celebration-heading');
      expect(heading.props.accessibilityRole).toBe('header');
    });

    it('modal has accessibilityViewIsModal', () => {
      const { getByTestId } = renderModal(LOYALTY_TIERS[1]);
      const modal = getByTestId('tier-celebration-modal');
      expect(modal.props.accessibilityViewIsModal).toBe(true);
    });

    it('modal overlay has an accessibilityLabel for screen readers', () => {
      const { getByTestId } = renderModal(LOYALTY_TIERS[1]);
      const modal = getByTestId('tier-celebration-modal');
      expect(modal.props.accessibilityLabel).toBeTruthy();
    });

    it('badge emoji container is hidden from accessibility tree (decorative)', () => {
      const { getByTestId } = renderModal(LOYALTY_TIERS[1]);
      const badge = getByTestId('tier-celebration-badge', { includeHiddenElements: true });
      expect(badge.props.accessibilityElementsHidden).toBe(true);
    });

    it('renders without crash when reduced motion is enabled', () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      expect(() => renderModal(LOYALTY_TIERS[2])).not.toThrow();
      jest.restoreAllMocks();
    });

    it('confetti is hidden when reduced motion is enabled', async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      const { queryByTestId } = renderModal(LOYALTY_TIERS[2]);
      // Wait for the async isReduceMotionEnabled to resolve and state to update
      await waitFor(() => expect(queryByTestId('tier-celebration-confetti')).toBeNull());
      jest.restoreAllMocks();
    });
  });
});
