/**
 * @module trails
 *
 * Trail registry and data types for the gamification trails feature.
 *
 * Three seasonal trails (spring/summer/fall), each with 5 challenges.
 * TrailsScreen shows the trail list or a per-trail challenge list.
 */

export type TrailId = 'spring' | 'summer' | 'fall';

export interface TrailChallenge {
  id: string;
  title: string;
  description: string;
  /** Progress ratio 0–1 */
  progress: number;
  completed: boolean;
}

export interface Trail {
  id: TrailId;
  name: string;
  description: string;
  /** Emoji icon representing the trail season */
  icon: string;
  challenges: TrailChallenge[];
}

export const TRAIL_REGISTRY: Trail[] = [
  {
    id: 'spring',
    name: 'Spring Trail',
    description: 'Fresh starts and new arrivals — discover spring collections.',
    icon: '🌸',
    challenges: [
      {
        id: 'spring-1',
        title: 'Fresh Eyes',
        description: 'Browse 5 new spring arrivals.',
        progress: 0,
        completed: false,
      },
      {
        id: 'spring-2',
        title: 'Wishlist Builder',
        description: 'Add 3 items to your wishlist.',
        progress: 0,
        completed: false,
      },
      {
        id: 'spring-3',
        title: 'Spring Shopper',
        description: 'Make your first spring purchase.',
        progress: 0,
        completed: false,
      },
      {
        id: 'spring-4',
        title: 'Style Scout',
        description: 'Complete the style quiz.',
        progress: 0,
        completed: false,
      },
      {
        id: 'spring-5',
        title: 'Share the Love',
        description: 'Refer a friend to Carolina Futons.',
        progress: 0,
        completed: false,
      },
    ],
  },
  {
    id: 'summer',
    name: 'Summer Trail',
    description: 'Hot deals and long days — make the most of summer.',
    icon: '☀️',
    challenges: [
      {
        id: 'summer-1',
        title: 'Sun Seeker',
        description: 'Browse the outdoor collection.',
        progress: 0,
        completed: false,
      },
      {
        id: 'summer-2',
        title: 'Flash Buyer',
        description: 'Purchase during a flash sale.',
        progress: 0,
        completed: false,
      },
      {
        id: 'summer-3',
        title: 'Streak Starter',
        description: 'Maintain a 7-day app streak.',
        progress: 0,
        completed: false,
      },
      {
        id: 'summer-4',
        title: 'Room Planner',
        description: 'Use AR view on 2 products.',
        progress: 0,
        completed: false,
      },
      {
        id: 'summer-5',
        title: 'Summer Loyalist',
        description: 'Earn 1000 loyalty points.',
        progress: 0,
        completed: false,
      },
    ],
  },
  {
    id: 'fall',
    name: 'Fall Trail',
    description: 'Cozy up for the season — autumn comfort awaits.',
    icon: '🍂',
    challenges: [
      {
        id: 'fall-1',
        title: 'Cozy Corner',
        description: 'View 5 sofa-bed products.',
        progress: 0,
        completed: false,
      },
      {
        id: 'fall-2',
        title: 'Review Guru',
        description: 'Read 10 product reviews.',
        progress: 0,
        completed: false,
      },
      {
        id: 'fall-3',
        title: 'Comparison Shopper',
        description: 'Compare 3 products side-by-side.',
        progress: 0,
        completed: false,
      },
      {
        id: 'fall-4',
        title: 'In-Store Explorer',
        description: 'Visit a Carolina Futons store location.',
        progress: 0,
        completed: false,
      },
      {
        id: 'fall-5',
        title: 'Fall Finale',
        description: 'Complete all other fall challenges.',
        progress: 0,
        completed: false,
      },
    ],
  },
];

/** Look up a trail by ID. Returns undefined for unknown IDs. */
export function getTrailById(id: string): Trail | undefined {
  return TRAIL_REGISTRY.find((t) => t.id === id);
}

/** Whether all challenges in a trail are completed. */
export function isTrailCompleted(trail: Trail): boolean {
  return trail.challenges.every((c) => c.completed);
}
