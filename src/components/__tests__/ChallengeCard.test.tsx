import React from 'react';
import { render } from '@testing-library/react-native';
import { ChallengeCard } from '../ChallengeCard';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { Challenge } from '@/data/challenges';

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

const BASE_CHALLENGE: Challenge = {
  id: 'spring-refresh',
  title: 'Spring Refresh',
  description: 'Browse 5 new arrivals.',
  reward: '500 pts',
  progress: 0.4,
  expiresAt: NOW + 7 * DAY,
  isActive: true,
  type: 'points',
};

function renderCard(challenge: Partial<Challenge> = {}) {
  return render(
    <ThemeProvider>
      <ChallengeCard challenge={{ ...BASE_CHALLENGE, ...challenge }} />
    </ThemeProvider>,
  );
}

describe('ChallengeCard', () => {
  describe('content', () => {
    it('renders the challenge title', () => {
      const { getByText } = renderCard();
      expect(getByText('Spring Refresh')).toBeTruthy();
    });

    it('renders the reward label', () => {
      const { getByText } = renderCard();
      expect(getByText('500 pts')).toBeTruthy();
    });

    it('renders description', () => {
      const { getByText } = renderCard();
      expect(getByText('Browse 5 new arrivals.')).toBeTruthy();
    });

    it('renders a 2× pts multiplier reward', () => {
      const { getByText } = renderCard({ reward: '2× pts', type: 'multiplier' });
      expect(getByText('2× pts')).toBeTruthy();
    });
  });

  describe('testIDs', () => {
    it('has correct card testID', () => {
      const { getByTestId } = renderCard();
      expect(getByTestId('challenge-card-spring-refresh')).toBeTruthy();
    });

    it('has correct progress bar testID', () => {
      const { getByTestId } = renderCard();
      expect(getByTestId('challenge-progress-spring-refresh')).toBeTruthy();
    });

    it('has correct countdown testID', () => {
      const { getByTestId } = renderCard();
      expect(getByTestId('challenge-countdown-spring-refresh')).toBeTruthy();
    });
  });

  describe('progress bar', () => {
    it('renders progress bar with non-zero progress', () => {
      const { getByTestId } = renderCard({ progress: 0.5 });
      expect(getByTestId('challenge-progress-spring-refresh')).toBeTruthy();
    });

    it('renders progress bar at zero progress', () => {
      const { getByTestId } = renderCard({ progress: 0 });
      expect(getByTestId('challenge-progress-spring-refresh')).toBeTruthy();
    });

    it('renders progress bar at full progress', () => {
      const { getByTestId } = renderCard({ progress: 1 });
      expect(getByTestId('challenge-progress-spring-refresh')).toBeTruthy();
    });
  });

  describe('countdown', () => {
    it('shows days remaining when > 1 day left', () => {
      const { getByTestId } = renderCard({ expiresAt: NOW + 3 * DAY });
      const countdown = getByTestId('challenge-countdown-spring-refresh');
      expect(countdown.props.children).toMatch(/\d+d/);
    });

    it('shows hours remaining when < 1 day left', () => {
      const { getByTestId } = renderCard({ expiresAt: NOW + 5 * 60 * 60 * 1000 });
      const countdown = getByTestId('challenge-countdown-spring-refresh');
      expect(countdown.props.children).toMatch(/\d+h/);
    });

    it('shows "Expired" when expiresAt is in the past', () => {
      const { getByTestId } = renderCard({ expiresAt: NOW - 1000 });
      const countdown = getByTestId('challenge-countdown-spring-refresh');
      expect(countdown.props.children).toBe('Expired');
    });
  });

  describe('active state', () => {
    it('renders active badge when isActive=true', () => {
      const { getByTestId } = renderCard({ isActive: true });
      expect(getByTestId('challenge-active-badge-spring-refresh')).toBeTruthy();
    });

    it('does not render active badge when isActive=false', () => {
      const { queryByTestId } = renderCard({ isActive: false });
      expect(queryByTestId('challenge-active-badge-spring-refresh')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('has accessibilityRole="button" on card', () => {
      const { getByTestId } = renderCard();
      const card = getByTestId('challenge-card-spring-refresh');
      expect(card.props.accessibilityRole).toBe('button');
    });
  });
});
