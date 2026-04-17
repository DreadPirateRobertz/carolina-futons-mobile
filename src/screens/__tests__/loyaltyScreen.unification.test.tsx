/**
 * LoyaltyScreen unification tests — cm-jyl
 *
 * Verifies that LoyaltyScreen wires to live Wix data sources:
 * - Activity section renders real points events (not hardcoded "No transactions")
 * - Activity section shows loading skeleton while usePointsHistory loads
 * - Activity section shows error banner on points history fetch failure
 * - Activity section shows empty state when no events
 * - "Your Perks" section renders delivered perks from useTierPerks
 * - "Your Perks" shows perks loading skeleton while fetching
 * - "Your Perks" shows perk coupon code when present
 * - Unauthenticated: Activity shows empty state, Perks shows empty (no crash)
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { LoyaltyScreen } from '../LoyaltyScreen';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sandBase: '#E8D5B7',
      sandLight: '#F2E8D5',
      sandDark: '#D4BC96',
      espresso: '#3A2518',
      espressoLight: '#5C4033',
      sunsetCoral: '#E8845C',
      sunsetCoralLight: '#F2A882',
      mountainBlue: '#5B8FA8',
      white: '#FFFFFF',
      muted: '#999999',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    borderRadius: { button: 8, pill: 9999, card: 12, sm: 4, md: 8 },
    typography: {
      headingFamily: 'PlayfairDisplay_700Bold',
      bodyFamily: 'SourceSans3_400Regular',
      bodyFamilySemiBold: 'SourceSans3_600SemiBold',
      bodyFamilyBold: 'SourceSans3_700Bold',
      heroTitle: { fontSize: 42, fontWeight: '700', lineHeight: 46 },
      h1: { fontSize: 34, fontWeight: '700', lineHeight: 39 },
      body: { fontSize: 15, fontWeight: '400', lineHeight: 24 },
      button: { fontSize: 15, fontWeight: '600', lineHeight: 15, letterSpacing: 0.6 },
    },
    shadows: { button: {}, card: {}, cardHover: {} },
  }),
}));

jest.mock('@/components/LoyaltyBadge', () => ({
  LoyaltyBadge: () => null,
}));

jest.mock('@/components/TierPerkCard', () => ({
  TierPerkCard: () => null,
}));

jest.mock('@/components/Skeleton', () => ({
  SkeletonCard: ({ testID }: { testID?: string }) => {
    const { View } = require('react-native');
    return <View testID={testID ?? 'skeleton-card'} />;
  },
  SkeletonRow: ({ testID }: { testID?: string }) => {
    const { View } = require('react-native');
    return <View testID={testID ?? 'skeleton-row'} />;
  },
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: jest.fn(() => ({
    emitStreakExtended: jest.fn(),
    emitTierChanged: jest.fn(),
  })),
}));

jest.mock('@/services/crossRigEventBus', () => ({
  emitStreakExtended: jest.fn(() => Promise.resolve()),
  emitTierChanged: jest.fn(() => Promise.resolve()),
}));

const mockUseLoyalty = jest.fn();
jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockUseLoyalty(),
}));

const mockUseStreak = jest.fn();
jest.mock('@/hooks/useStreak', () => ({
  useStreak: () => mockUseStreak(),
}));

const mockUsePointsHistory = jest.fn();
jest.mock('@/hooks/usePointsHistory', () => ({
  usePointsHistory: () => mockUsePointsHistory(),
}));

const mockUseTierPerks = jest.fn();
jest.mock('@/hooks/useTierPerks', () => ({
  useTierPerks: () => mockUseTierPerks(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TRAIL_BLAZER = {
  name: 'Trail Blazer',
  minPoints: 0,
  color: '#8B7355',
  icon: 'trail-blazer',
  earnRate: 0.06,
  perks: ['Earn 1 point per $1 spent'],
};

const MOUNTAIN_GUIDE = {
  name: 'Mountain Guide',
  minPoints: 500,
  color: '#5B8FA8',
  icon: 'mountain-guide',
  earnRate: 0.09,
  perks: ['Earn 1.5x points per $1', 'Free standard shipping'],
};

const loyaltyLoaded = {
  points: 500,
  tier: MOUNTAIN_GUIDE,
  nextTier: null,
  pointsToNext: 0,
  progress: 100,
  loading: false,
  error: null,
  refreshPoints: jest.fn(),
  awardPoints: jest.fn(),
};

const streakIdle = {
  streak: 0,
  loading: false,
  wasExtendedToday: false,
  longestStreak: 0,
};

const POINTS_EVENT = {
  id: 'ev-1',
  type: 'purchase' as const,
  description: 'Ordered Blue Ridge Sectional',
  points: 250,
  earnedAt: '2026-04-01T12:00:00Z',
};

const noPerks = { perks: [], loading: false, error: null };
const noHistory = { events: [], loading: false, error: null, refresh: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLoyalty.mockReturnValue(loyaltyLoaded);
  mockUseStreak.mockReturnValue(streakIdle);
  mockUsePointsHistory.mockReturnValue(noHistory);
  mockUseTierPerks.mockReturnValue(noPerks);
});

// ─── Activity section — real data ────────────────────────────────────────────

describe('Activity section — renders live points history', () => {
  it('renders a points event row when events are available', async () => {
    mockUsePointsHistory.mockReturnValue({
      events: [POINTS_EVENT],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByTestId } = render(<LoyaltyScreen />);
    await waitFor(() => {
      expect(getByTestId('loyalty-activity-event-ev-1')).toBeTruthy();
    });
  });

  it('renders points amount on each event row', async () => {
    mockUsePointsHistory.mockReturnValue({
      events: [POINTS_EVENT],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByTestId } = render(<LoyaltyScreen />);
    await waitFor(() => {
      expect(getByTestId('loyalty-activity-points-ev-1')).toBeTruthy();
    });
  });

  it('shows empty state text when events array is empty', async () => {
    mockUsePointsHistory.mockReturnValue(noHistory);
    const { getByTestId } = render(<LoyaltyScreen />);
    await waitFor(() => {
      expect(getByTestId('loyalty-no-activity')).toBeTruthy();
    });
  });

  it('does NOT show hardcoded "No transactions yet" when events exist', async () => {
    mockUsePointsHistory.mockReturnValue({
      events: [POINTS_EVENT],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { queryByTestId } = render(<LoyaltyScreen />);
    await waitFor(() => {
      expect(queryByTestId('loyalty-no-activity')).toBeNull();
    });
  });

  it('shows activity loading skeleton while history is loading', () => {
    mockUsePointsHistory.mockReturnValue({
      events: [],
      loading: true,
      error: null,
      refresh: jest.fn(),
    });
    const { getByTestId } = render(<LoyaltyScreen />);
    expect(getByTestId('loyalty-activity-loading')).toBeTruthy();
  });

  it('shows activity error banner when history fetch fails', async () => {
    mockUsePointsHistory.mockReturnValue({
      events: [],
      loading: false,
      error: 'Unable to load points history. Please try again.',
      refresh: jest.fn(),
    });
    const { getByTestId } = render(<LoyaltyScreen />);
    await waitFor(() => {
      expect(getByTestId('loyalty-activity-error')).toBeTruthy();
    });
  });

  it('renders multiple events when several are returned', async () => {
    mockUsePointsHistory.mockReturnValue({
      events: [
        POINTS_EVENT,
        {
          id: 'ev-2',
          type: 'review' as const,
          description: 'Reviewed sofa',
          points: 50,
          earnedAt: '2026-04-02T10:00:00Z',
        },
        {
          id: 'ev-3',
          type: 'referral' as const,
          description: 'Referred a friend',
          points: 100,
          earnedAt: '2026-04-03T10:00:00Z',
        },
      ],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByTestId } = render(<LoyaltyScreen />);
    await waitFor(() => {
      expect(getByTestId('loyalty-activity-event-ev-1')).toBeTruthy();
      expect(getByTestId('loyalty-activity-event-ev-2')).toBeTruthy();
      expect(getByTestId('loyalty-activity-event-ev-3')).toBeTruthy();
    });
  });
});

// ─── Your Perks section — TierPerkDeliveries ─────────────────────────────────

describe('Your Perks section — tier perk deliveries', () => {
  it('shows perks loading skeleton while fetching', () => {
    mockUseTierPerks.mockReturnValue({ perks: [], loading: true, error: null });
    const { getByTestId } = render(<LoyaltyScreen />);
    expect(getByTestId('loyalty-perks-loading')).toBeTruthy();
  });

  it('renders delivered perk rows when perks are loaded', async () => {
    mockUseTierPerks.mockReturnValue({
      perks: [
        {
          perkType: 'FREE_WHITE_GLOVE',
          tier: 'Summit Master',
          deliveredAt: '2026-04-01T00:00:00Z',
        },
      ],
      loading: false,
      error: null,
    });
    const { getByTestId } = render(<LoyaltyScreen />);
    await waitFor(() => {
      expect(getByTestId('loyalty-perk-FREE_WHITE_GLOVE')).toBeTruthy();
    });
  });

  it('renders coupon code when perk has one', async () => {
    mockUseTierPerks.mockReturnValue({
      perks: [
        {
          perkType: 'ACCESSORY_DISCOUNT',
          tier: 'Mountain Guide',
          deliveredAt: '2026-04-01T00:00:00Z',
          couponCode: 'CF-XYZ9999',
        },
      ],
      loading: false,
      error: null,
    });
    const { getByTestId } = render(<LoyaltyScreen />);
    await waitFor(() => {
      expect(getByTestId('loyalty-perk-coupon-ACCESSORY_DISCOUNT')).toBeTruthy();
    });
  });

  it('renders booking link for STYLING_CALL perk', async () => {
    mockUseTierPerks.mockReturnValue({
      perks: [
        {
          perkType: 'STYLING_CALL',
          tier: 'Summit Master',
          deliveredAt: '2026-04-01T00:00:00Z',
          bookingUrl: 'https://calendly.com/test',
        },
      ],
      loading: false,
      error: null,
    });
    const { getByTestId } = render(<LoyaltyScreen />);
    await waitFor(() => {
      expect(getByTestId('loyalty-perk-booking-STYLING_CALL')).toBeTruthy();
    });
  });

  it('shows empty perks message when no perks delivered (Trail Blazer)', async () => {
    mockUseTierPerks.mockReturnValue(noPerks);
    const { getByTestId } = render(<LoyaltyScreen />);
    await waitFor(() => {
      expect(getByTestId('loyalty-perks-empty')).toBeTruthy();
    });
  });
});
