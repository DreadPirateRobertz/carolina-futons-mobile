/**
 * Mock points history data.
 * Used as fallback when wix client is unavailable (offline / dev).
 * cf-g4r / Phase 7
 */

export interface PointsEvent {
  id: string;
  type: 'purchase' | 'review' | 'referral' | 'challenge_complete' | 'streak_milestone' | 'daily_quest';
  description: string;
  points: number;
  earnedAt: string; // ISO 8601
}

export const MOCK_POINTS_EVENTS: PointsEvent[] = [
  {
    id: 'mock-1',
    type: 'purchase',
    description: 'Ordered Blue Ridge Sectional',
    points: 250,
    earnedAt: '2026-03-20T14:00:00Z',
  },
  {
    id: 'mock-2',
    type: 'review',
    description: 'Reviewed Asheville Loveseat',
    points: 50,
    earnedAt: '2026-03-18T09:30:00Z',
  },
  {
    id: 'mock-3',
    type: 'challenge_complete',
    description: 'Spring Refresh challenge completed',
    points: 500,
    earnedAt: '2026-03-15T16:00:00Z',
  },
  {
    id: 'mock-4',
    type: 'referral',
    description: 'Referred a friend',
    points: 100,
    earnedAt: '2026-03-10T10:00:00Z',
  },
  {
    id: 'mock-5',
    type: 'streak_milestone',
    description: '7-day streak milestone',
    points: 75,
    earnedAt: '2026-03-07T08:00:00Z',
  },
  {
    id: 'mock-6',
    type: 'daily_quest',
    description: 'Daily quest: Browse new arrivals',
    points: 25,
    earnedAt: '2026-03-01T12:00:00Z',
  },
];
