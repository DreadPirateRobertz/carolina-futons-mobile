import React from 'react';
import { render } from '@testing-library/react-native';
import { ChallengesRail } from '../ChallengesRail';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { Challenge } from '@/data/challenges';

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

const CHALLENGES: Challenge[] = [
  {
    id: 'spring-refresh',
    title: 'Spring Refresh',
    description: 'Browse 5 new arrivals.',
    reward: '500 pts',
    progress: 0.4,
    expiresAt: NOW + 7 * DAY,
    isActive: true,
    type: 'points',
  },
  {
    id: 'flash-weekend',
    title: 'Flash Weekend',
    description: 'Purchase this weekend.',
    reward: '2× pts',
    progress: 0,
    expiresAt: NOW + 2 * DAY,
    isActive: true,
    type: 'multiplier',
  },
  {
    id: 'streak-saver',
    title: 'Streak Saver',
    description: 'Open 3 days in a row.',
    reward: '100 pts',
    progress: 0.67,
    expiresAt: NOW + 1 * DAY,
    isActive: true,
    type: 'streak',
  },
];

function renderRail(challenges: Challenge[] = CHALLENGES) {
  return render(
    <ThemeProvider>
      <ChallengesRail challenges={challenges} />
    </ThemeProvider>,
  );
}

describe('ChallengesRail', () => {
  describe('empty state', () => {
    it('renders nothing when challenges list is empty', () => {
      const { queryByTestId } = renderRail([]);
      expect(queryByTestId('challenges-rail')).toBeNull();
    });
  });

  describe('renders rail', () => {
    it('renders the rail container when challenges exist', () => {
      const { getByTestId } = renderRail();
      expect(getByTestId('challenges-rail')).toBeTruthy();
    });

    it('renders "Challenges" header', () => {
      const { getByText } = renderRail();
      expect(getByText('Challenges')).toBeTruthy();
    });

    it('renders a card for each challenge', () => {
      const { getByTestId } = renderRail();
      expect(getByTestId('challenge-card-spring-refresh')).toBeTruthy();
      expect(getByTestId('challenge-card-flash-weekend')).toBeTruthy();
      expect(getByTestId('challenge-card-streak-saver')).toBeTruthy();
    });

    it('renders a single challenge correctly', () => {
      const { getByTestId, getByText } = renderRail([CHALLENGES[0]]);
      expect(getByTestId('challenge-card-spring-refresh')).toBeTruthy();
      expect(getByText('Spring Refresh')).toBeTruthy();
    });
  });

  describe('testID forwarding', () => {
    it('accepts custom testID', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ChallengesRail challenges={CHALLENGES} testID="custom-rail" />
        </ThemeProvider>,
      );
      expect(getByTestId('custom-rail')).toBeTruthy();
    });
  });
});
