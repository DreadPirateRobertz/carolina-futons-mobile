/**
 * @module challenges
 *
 * Challenge data types and seed data for the gamification challenges rail.
 */

export type ChallengeType = 'points' | 'multiplier' | 'streak';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  /** Human-readable reward label, e.g. "500 pts" or "2× pts" */
  reward: string;
  /** Progress ratio 0–1 */
  progress: number;
  /** Unix timestamp (ms) when the challenge expires */
  expiresAt: number;
  /** Whether the challenge is currently active (unlocked, in progress) */
  isActive: boolean;
  type: ChallengeType;
}

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

export const CHALLENGES: Challenge[] = [
  {
    id: 'spring-refresh',
    title: 'Spring Refresh',
    description: 'Browse 5 new arrivals and add one to your wishlist.',
    reward: '500 pts',
    progress: 0.4,
    expiresAt: NOW + 7 * DAY,
    isActive: true,
    type: 'points',
  },
  {
    id: 'flash-weekend',
    title: 'Flash Weekend',
    description: 'Make a purchase this weekend to earn double points.',
    reward: '2× pts',
    progress: 0,
    expiresAt: NOW + 2 * DAY,
    isActive: true,
    type: 'multiplier',
  },
  {
    id: 'streak-saver',
    title: 'Streak Saver',
    description: 'Open the app 3 days in a row to protect your streak.',
    reward: '100 pts',
    progress: 0.67,
    expiresAt: NOW + 1 * DAY,
    isActive: true,
    type: 'streak',
  },
];
