import React from 'react';
import { render } from '@testing-library/react-native';
import { ChallengeCard } from '../ChallengeCard';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { Challenge } from '@/data/challenges';

// Mock Reanimated — progress bar uses useSharedValue + useAnimatedStyle + withTiming
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (val: any) => val,
    Easing: { out: () => undefined, cubic: undefined },
  };
});

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

  describe('animated progress fill', () => {
    it('renders animated fill element with correct testID', () => {
      const { getByTestId } = renderCard();
      expect(getByTestId('challenge-progress-fill-spring-refresh')).toBeTruthy();
    });

    it('clamps progress above 1.0 to 100% in accessibilityValue', () => {
      const { getByTestId } = renderCard({ progress: 1.5 });
      const track = getByTestId('challenge-progress-spring-refresh');
      expect(track.props.accessibilityValue.now).toBe(100);
    });

    it('clamps negative progress to 0% in accessibilityValue', () => {
      const { getByTestId } = renderCard({ progress: -0.5 });
      const track = getByTestId('challenge-progress-spring-refresh');
      expect(track.props.accessibilityValue.now).toBe(0);
    });

    it('reports correct accessibilityValue for partial progress', () => {
      const { getByTestId } = renderCard({ progress: 0.6 });
      const track = getByTestId('challenge-progress-spring-refresh');
      expect(track.props.accessibilityValue.now).toBe(60);
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

    it('shows "Completed!" when progress=1.0', () => {
      const { getByTestId } = renderCard({ progress: 1.0 });
      const countdown = getByTestId('challenge-countdown-spring-refresh');
      expect(countdown.props.children).toBe('Completed!');
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

  describe('completion state (progress=1.0)', () => {
    it('renders checkmark element at progress=1.0', () => {
      const { getByTestId } = renderCard({ progress: 1.0 });
      expect(getByTestId('challenge-complete-check-spring-refresh')).toBeTruthy();
    });

    it('renders "Reward earned!" text at progress=1.0', () => {
      const { getByText } = renderCard({ progress: 1.0 });
      expect(getByText('Reward earned!')).toBeTruthy();
    });

    it('does not render checkmark at progress=0.99', () => {
      const { queryByTestId } = renderCard({ progress: 0.99 });
      expect(queryByTestId('challenge-complete-check-spring-refresh')).toBeNull();
    });

    it('does not render checkmark at progress=0', () => {
      const { queryByTestId } = renderCard({ progress: 0 });
      expect(queryByTestId('challenge-complete-check-spring-refresh')).toBeNull();
    });

    it('does not render "Reward earned!" at progress < 1.0', () => {
      const { queryByText } = renderCard({ progress: 0.5 });
      expect(queryByText('Reward earned!')).toBeNull();
    });

    it('shows completion state for progress above 1.0 (clamped)', () => {
      const { getByTestId } = renderCard({ progress: 1.5 });
      expect(getByTestId('challenge-complete-check-spring-refresh')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('has accessibilityRole="button" on card', () => {
      const { getByTestId } = renderCard();
      const card = getByTestId('challenge-card-spring-refresh');
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('has accessibilityRole="progressbar" on track', () => {
      const { getByTestId } = renderCard();
      const track = getByTestId('challenge-progress-spring-refresh');
      expect(track.props.accessibilityRole).toBe('progressbar');
    });

    it('has accessibilityValue with min=0, max=100', () => {
      const { getByTestId } = renderCard({ progress: 0.75 });
      const track = getByTestId('challenge-progress-spring-refresh');
      expect(track.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 75 });
    });
  });

  describe('multiplier variant (Flash Weekend)', () => {
    it('renders coral accent border for multiplier type', () => {
      const { getByTestId } = renderCard({ type: 'multiplier', id: 'flash-weekend' });
      const card = getByTestId('challenge-card-flash-weekend');
      // borderColor should be sunsetCoral (#E8845C)
      const flatStyle = Array.isArray(card.props.style)
        ? Object.assign({}, ...card.props.style)
        : card.props.style;
      expect(flatStyle.borderColor).toBe('#E8845C');
      expect(flatStyle.borderWidth).toBeGreaterThan(0);
    });

    it('does not apply accent border for points type', () => {
      const { getByTestId } = renderCard({ type: 'points' });
      const card = getByTestId('challenge-card-spring-refresh');
      const flatStyle = Array.isArray(card.props.style)
        ? Object.assign({}, ...card.props.style)
        : card.props.style;
      expect(flatStyle.borderWidth ?? 0).toBe(0);
    });
  });
});
