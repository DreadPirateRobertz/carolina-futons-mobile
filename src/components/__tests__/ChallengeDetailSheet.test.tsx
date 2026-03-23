import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChallengeDetailSheet } from '../ChallengeDetailSheet';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { Challenge } from '@/data/challenges';

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const BASE_CHALLENGE: Challenge = {
  id: 'spring-refresh',
  title: 'Spring Refresh',
  description: 'Browse 5 new arrivals and add one to your wishlist.',
  reward: '500 pts',
  progress: 0.4,
  expiresAt: NOW + 7 * DAY,
  isActive: false,
  type: 'points',
};

function renderSheet(
  challenge: Challenge | null = BASE_CHALLENGE,
  visible = true,
  onClose = jest.fn(),
) {
  return render(
    <ThemeProvider>
      <ChallengeDetailSheet visible={visible} challenge={challenge} onClose={onClose} />
    </ThemeProvider>,
  );
}

describe('ChallengeDetailSheet', () => {
  describe('visibility', () => {
    it('renders nothing when challenge is null', () => {
      const { queryByTestId } = renderSheet(null);
      expect(queryByTestId('challenge-detail-sheet')).toBeNull();
    });

    it('renders sheet when visible=true and challenge provided', () => {
      const { getByTestId } = renderSheet();
      expect(getByTestId('challenge-detail-sheet')).toBeTruthy();
    });
  });

  describe('content', () => {
    it('renders challenge title', () => {
      const { getByTestId } = renderSheet();
      expect(getByTestId('challenge-detail-title').props.children).toBe('Spring Refresh');
    });

    it('renders challenge reward', () => {
      const { getByTestId } = renderSheet();
      expect(getByTestId('challenge-detail-reward').props.children).toBe('500 pts');
    });

    it('renders challenge description', () => {
      const { getByTestId } = renderSheet();
      expect(getByTestId('challenge-detail-description').props.children).toBe(
        'Browse 5 new arrivals and add one to your wishlist.',
      );
    });

    it('renders progress label with percentage', () => {
      const { getByTestId } = renderSheet();
      const label = getByTestId('challenge-detail-progress-label');
      expect(label.props.children).toContain('40%');
    });

    it('renders progress bar', () => {
      const { getByTestId } = renderSheet();
      expect(getByTestId('challenge-detail-progress-bar')).toBeTruthy();
    });
  });

  describe('countdown', () => {
    it('shows days + hours when > 1 day left', () => {
      const { getByTestId } = renderSheet({
        ...BASE_CHALLENGE,
        expiresAt: NOW + 2 * DAY + 14 * HOUR,
      });
      const countdown = getByTestId('challenge-detail-countdown');
      expect(countdown.props.children).toMatch(/Ends in \d+d \d+h/);
    });

    it('shows hours only when < 1 day left', () => {
      const { getByTestId } = renderSheet({
        ...BASE_CHALLENGE,
        expiresAt: NOW + 5 * HOUR,
      });
      const countdown = getByTestId('challenge-detail-countdown');
      expect(countdown.props.children).toMatch(/Ends in \d+h/);
    });

    it('shows "Expired" when expiresAt is in the past', () => {
      const { getByTestId } = renderSheet({ ...BASE_CHALLENGE, expiresAt: NOW - 1000 });
      const countdown = getByTestId('challenge-detail-countdown');
      expect(countdown.props.children).toBe('Expired');
    });
  });

  describe('active badge', () => {
    it('renders ACTIVE badge when isActive=true', () => {
      const { getByTestId } = renderSheet({ ...BASE_CHALLENGE, isActive: true });
      expect(getByTestId('challenge-detail-active-badge')).toBeTruthy();
    });

    it('does not render ACTIVE badge when isActive=false', () => {
      const { queryByTestId } = renderSheet({ ...BASE_CHALLENGE, isActive: false });
      expect(queryByTestId('challenge-detail-active-badge')).toBeNull();
    });
  });

  describe('close button', () => {
    it('renders close button', () => {
      const { getByTestId } = renderSheet();
      expect(getByTestId('challenge-detail-close')).toBeTruthy();
    });

    it('calls onClose when close button pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = renderSheet(BASE_CHALLENGE, true, onClose);
      fireEvent.press(getByTestId('challenge-detail-close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('close button has accessibilityRole="button"', () => {
      const { getByTestId } = renderSheet();
      expect(getByTestId('challenge-detail-close').props.accessibilityRole).toBe('button');
    });
  });

  describe('backdrop dismiss', () => {
    it('calls onClose when backdrop pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = renderSheet(BASE_CHALLENGE, true, onClose);
      fireEvent.press(getByTestId('challenge-detail-backdrop'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('progress bar has accessibilityRole="progressbar"', () => {
      const { getByTestId } = renderSheet();
      expect(getByTestId('challenge-detail-progress-bar').props.accessibilityRole).toBe(
        'progressbar',
      );
    });

    it('progress bar has correct accessibility value', () => {
      const { getByTestId } = renderSheet({ ...BASE_CHALLENGE, progress: 0.4 });
      const bar = getByTestId('challenge-detail-progress-bar');
      expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
    });
  });
});
