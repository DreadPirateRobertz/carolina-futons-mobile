/**
 * @module LoyaltyCard.test
 *
 * Component tests for LoyaltyCard — cm-a31 / CF-yq80 / deacon-cjv.
 * Tests tier display, progress bar, next-tier text, hidden state, and accessibility.
 *
 * Tier thresholds: Trail Blazer 0-499, Mountain Guide 500-1499,
 *                  Summit Master 1500-2999, Blue Ridge Legend 3000+
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { LoyaltyCard } from '../LoyaltyCard';

function renderCard(overrides: Partial<React.ComponentProps<typeof LoyaltyCard>> = {}) {
  const props = {
    points: 250,
    nextTierThreshold: 500,
    progressPercent: 50,
    hasActivity: true,
    ...overrides,
  };
  return render(
    <ThemeProvider>
      <LoyaltyCard {...props} />
    </ThemeProvider>,
  );
}

describe('LoyaltyCard', () => {
  describe('hidden state', () => {
    it('returns null when points=0 and hasActivity=false', () => {
      const { queryByTestId } = renderCard({ points: 0, hasActivity: false, progressPercent: 0 });
      expect(queryByTestId('loyalty-card')).toBeNull();
    });

    it('renders when points=0 but hasActivity=true', () => {
      const { getByTestId } = renderCard({ points: 0, hasActivity: true, progressPercent: 0 });
      expect(getByTestId('loyalty-card')).toBeTruthy();
    });

    it('renders when points>0', () => {
      const { getByTestId } = renderCard({ points: 250 });
      expect(getByTestId('loyalty-card')).toBeTruthy();
    });

    it('renders when points=3000 (Blue Ridge Legend)', () => {
      const { getByTestId } = renderCard({
        points: 3000,
        nextTierThreshold: 3000,
        progressPercent: 100,
      });
      expect(getByTestId('loyalty-card')).toBeTruthy();
    });
  });

  describe('tier badge', () => {
    it('shows Trail Blazer tier badge for 250 pts', () => {
      const { getByTestId } = renderCard({ points: 250 });
      expect(getByTestId('loyalty-badge-trail-blazer')).toBeTruthy();
    });

    it('shows Mountain Guide tier badge for 750 pts', () => {
      const { getByTestId } = renderCard({
        points: 750,
        nextTierThreshold: 1500,
        progressPercent: 50,
      });
      expect(getByTestId('loyalty-badge-mountain-guide')).toBeTruthy();
    });

    it('shows Summit Master tier badge for 1500 pts', () => {
      const { getByTestId } = renderCard({
        points: 1500,
        nextTierThreshold: 3000,
        progressPercent: 100,
      });
      expect(getByTestId('loyalty-badge-summit-master')).toBeTruthy();
    });

    it('shows Blue Ridge Legend tier badge for 3000 pts', () => {
      const { getByTestId } = renderCard({
        points: 3000,
        nextTierThreshold: 3000,
        progressPercent: 100,
      });
      expect(getByTestId('loyalty-badge-blue-ridge-legend')).toBeTruthy();
    });

    it('Trail Blazer badge has accessible label', () => {
      const { getByTestId } = renderCard({ points: 250 });
      expect(getByTestId('loyalty-badge-trail-blazer').props.accessibilityLabel).toBe(
        'Trail Blazer tier',
      );
    });
  });

  describe('points display', () => {
    it('shows correct points count', () => {
      const { getByTestId } = renderCard({ points: 250 });
      expect(getByTestId('loyalty-points').props.children).toBe('250');
    });

    it('shows 0 points when hasActivity but points=0', () => {
      const { getByTestId } = renderCard({ points: 0, hasActivity: true });
      expect(getByTestId('loyalty-points').props.children).toBe('0');
    });

    it('testID loyalty-points is present', () => {
      const { getByTestId } = renderCard();
      expect(getByTestId('loyalty-points')).toBeTruthy();
    });
  });

  describe('progress bar', () => {
    it('testID loyalty-progress-bar is present', () => {
      const { getByTestId } = renderCard();
      expect(getByTestId('loyalty-progress-bar')).toBeTruthy();
    });

    it('progress bar width is 0% at 0 progressPercent', () => {
      const { getByTestId } = renderCard({ progressPercent: 0 });
      const bar = getByTestId('loyalty-progress-bar');
      const width = Array.isArray(bar.props.style)
        ? bar.props.style.find((s: Record<string, unknown>) => s?.width !== undefined)?.width
        : bar.props.style?.width;
      expect(width).toBe('0%');
    });

    it('progress bar width is 50% at 50 progressPercent', () => {
      const { getByTestId } = renderCard({ progressPercent: 50 });
      const bar = getByTestId('loyalty-progress-bar');
      const width = Array.isArray(bar.props.style)
        ? bar.props.style.find((s: Record<string, unknown>) => s?.width !== undefined)?.width
        : bar.props.style?.width;
      expect(width).toBe('50%');
    });

    it('progress bar width is 99% at 99 progressPercent', () => {
      const { getByTestId } = renderCard({ progressPercent: 99 });
      const bar = getByTestId('loyalty-progress-bar');
      const width = Array.isArray(bar.props.style)
        ? bar.props.style.find((s: Record<string, unknown>) => s?.width !== undefined)?.width
        : bar.props.style?.width;
      expect(width).toBe('99%');
    });

    it('progress bar width is 100% for Blue Ridge Legend', () => {
      const { getByTestId } = renderCard({
        points: 3000,
        nextTierThreshold: 3000,
        progressPercent: 100,
      });
      const bar = getByTestId('loyalty-progress-bar');
      const width = Array.isArray(bar.props.style)
        ? bar.props.style.find((s: Record<string, unknown>) => s?.width !== undefined)?.width
        : bar.props.style?.width;
      expect(width).toBe('100%');
    });
  });

  describe('next-tier text', () => {
    it('testID loyalty-next-tier-text is present', () => {
      const { getByTestId } = renderCard();
      expect(getByTestId('loyalty-next-tier-text')).toBeTruthy();
    });

    it('shows "250 points to Mountain Guide" for Trail Blazer at 250 pts', () => {
      const { getByTestId } = renderCard({ points: 250, nextTierThreshold: 500 });
      expect(getByTestId('loyalty-next-tier-text').props.children).toBe(
        '250 points to Mountain Guide',
      );
    });

    it('shows "750 points to Summit Master" for Mountain Guide at 750 pts', () => {
      const { getByTestId } = renderCard({ points: 750, nextTierThreshold: 1500 });
      expect(getByTestId('loyalty-next-tier-text').props.children).toBe(
        '750 points to Summit Master',
      );
    });

    it('shows "You\'ve reached Blue Ridge Legend!" for top tier', () => {
      const { getByTestId } = renderCard({
        points: 3000,
        nextTierThreshold: 3000,
        progressPercent: 100,
      });
      expect(getByTestId('loyalty-next-tier-text').props.children).toBe(
        "You've reached Blue Ridge Legend!",
      );
    });

    it('shows "1000 points to Summit Master" when at Mountain Guide threshold', () => {
      const { getByTestId } = renderCard({ points: 500, nextTierThreshold: 500 });
      expect(getByTestId('loyalty-next-tier-text').props.children).toBe(
        '1000 points to Summit Master',
      );
    });
  });

  describe('accessibility / testIDs', () => {
    it('has testID loyalty-card', () => {
      const { getByTestId } = renderCard();
      expect(getByTestId('loyalty-card')).toBeTruthy();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = renderCard({ testID: 'my-card' });
      expect(getByTestId('my-card')).toBeTruthy();
    });

    it('progress track is present', () => {
      const { getByTestId } = renderCard();
      expect(getByTestId('loyalty-progress-track')).toBeTruthy();
    });
  });
});
