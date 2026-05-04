/**
 * HomeScreen deeper edge cases — cm-bua
 *
 * Covers:
 * - Personalization rail empty (no quiz taken, not loading)
 * - Featured products empty (no collections, not loading)
 * - Banner CTA (promo loading skeleton, carousel with items)
 * - Offline skeleton (collectionsLoading=true, featured empty → skeleton row)
 * - Refresh error (error state shows "Couldn't refresh content" + stale data visible)
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { HomeScreen } from '../HomeScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ─── Component mocks ──────────────────────────────────────────────────────────

jest.mock('@/components/LivingSkyBackground', () => ({
  LivingSkyBackground: () => {
    const { View } = require('react-native');
    return <View testID="living-sky-background" />;
  },
}));

jest.mock('@/components/WildlifeLayer', () => ({
  WildlifeLayer: ({ skyState }: any) => {
    const { View } = require('react-native');
    return (
      <View testID="wildlife-layer" accessibilityLabel={`birdOpacity:${skyState.birdOpacity}`} />
    );
  },
}));

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (c: React.ComponentType) => c,
    },
    useSharedValue: (init: number) => ({ value: init }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSpring: (val: number) => val,
    withSequence: (...vals: number[]) => vals[vals.length - 1],
    withTiming: (val: number) => val,
    withDelay: (_delay: number, animation: unknown) => animation,
    withRepeat: (val: unknown) => val,
    runOnJS: (fn: (...args: unknown[]) => void) => fn,
    Easing: {
      inOut: () => () => {},
      out: () => () => {},
      in: () => () => {},
      ease: () => {},
      linear: () => {},
      bezier: () => () => {},
    },
  };
});

// ─── Hook mocks ───────────────────────────────────────────────────────────────

const mockRefreshSky = jest.fn();
jest.mock('@/hooks/useLivingSky', () => ({
  useLivingSky: () => ({
    skyColors: ['#2858A0', '#4878A8', '#88B0C4', '#A4C8DC'] as [string, string, string, string],
    glowColors: ['transparent', 'transparent'] as [string, string],
    ridgeColors: { r1: '#1C4454', r2: '#487494', r3: '#7AA4BE', r4: '#AECCD8', tree: '#0C1C26' },
    sunPos: { cx: 524, cy: 52, r: 16, opacity: 1 },
    moonPos: { cx: 200, cy: 200, opacity: 0, phase: 0, shadowOffset: { dx: 0, dy: 0 } },
    starOpacity: 0,
    cloudOpacity: 0,
    birdOpacity: 0,
    fireflyOpacity: 0,
    owlOpacity: 0,
    rimOpacity: 0.04,
    rimColor: '#FFFCE8',
    navBg: '#ffffff',
    navText: '#1E2A3A',
    season: 'summer' as const,
    precipitationOpacity: 0,
    precipitationType: 'none' as const,
    refresh: mockRefreshSky,
  }),
}));

const mockUseCollections = jest.fn();
jest.mock('@/hooks/useCollections', () => {
  const actual = jest.requireActual('@/hooks/useCollections');
  return { ...actual, useCollections: () => mockUseCollections() };
});

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => ({
    queryData: jest.fn().mockResolvedValue({ items: [], totalResults: 0 }),
  }),
}));

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => ({
    queryData: jest.fn().mockResolvedValue({ items: [], totalResults: 0 }),
  }),
}));

jest.mock('@/hooks/useActiveChallenges', () => ({
  useActiveChallenges: () => ({ challenges: [], loading: false, error: null, refresh: jest.fn() }),
}));

const mockUseTriggerMoments = jest.fn();
jest.mock('@/hooks/useTriggerMoments', () => ({
  useTriggerMoments: () => mockUseTriggerMoments(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const mockUseDailyQuests = jest.fn();
jest.mock('@/hooks/useDailyQuests', () => ({
  useDailyQuests: () => mockUseDailyQuests(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));

const mockUsePersonalization = jest.fn();
jest.mock('@/hooks/usePersonalization', () => ({
  usePersonalization: () => mockUsePersonalization(),
}));

const mockUsePromotion = jest.fn();
jest.mock('@/hooks/usePromotion', () => ({
  usePromotion: () => mockUsePromotion(),
}));

jest.mock('@/hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({
    recentProducts: [],
    addViewed: jest.fn(),
    clearAll: jest.fn(),
    count: 0,
  }),
}));

jest.mock('@/hooks/useStreak', () => ({
  useStreak: () => ({ streak: 0, loading: false, wasExtendedToday: false, longestStreak: 0 }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COLLECTION_FIXTURE = {
  id: 'c1',
  slug: 'mountain-lodge-living',
  title: 'Mountain Lodge Living',
  subtitle: 'Warm tones, solid wood, peak comfort',
  description: '',
  heroImage: { uri: '', alt: '' },
  mood: [],
  featured: true,
  productIds: [],
};

const collectionsLoaded = {
  collections: [COLLECTION_FIXTURE],
  featured: [COLLECTION_FIXTURE],
  isLoading: false,
  isStale: false,
  error: null,
  refresh: jest.fn(),
};

const collectionsEmpty = {
  collections: [],
  featured: [],
  isLoading: false,
  isStale: false,
  error: null,
  refresh: jest.fn(),
};

const noPersonalization = {
  sommelierResult: null,
  recommendations: [],
  topStyle: null,
  isLoading: false,
  error: null,
};

const PROMO_ITEM = {
  id: 'promo-free-shipping',
  title: 'Free Shipping',
  subtitle: 'On all orders over $299',
  ctaText: 'Shop Now',
  deepLink: 'carolinafutons://shop',
  emoji: '🚚',
  accentColor: '#5B8FA8',
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderHomeScreen(props: Partial<React.ComponentProps<typeof HomeScreen>> = {}) {
  return render(
    <NavigationContainer>
      <ThemeProvider>
        <HomeScreen {...props} />
      </ThemeProvider>
    </NavigationContainer>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseTriggerMoments.mockReturnValue({
    triggers: { tierChanged: null, streakDanger: false },
    dismiss: jest.fn(),
  });
  mockUseDailyQuests.mockReturnValue({ quests: [], loading: false, refresh: jest.fn() });
  mockUsePersonalization.mockReturnValue(noPersonalization);
  mockUseCollections.mockReturnValue(collectionsLoaded);
  mockUsePromotion.mockReturnValue({ items: [PROMO_ITEM], isLoading: false });
});

// ─── Personalization rail empty ───────────────────────────────────────────────

describe('personalization rail empty', () => {
  it('personalized-picks section is not rendered when no quiz taken and not loading', () => {
    mockUsePersonalization.mockReturnValue(noPersonalization);
    const { queryByTestId } = renderHomeScreen();
    expect(queryByTestId('personalized-picks')).toBeNull();
    expect(queryByTestId('skeleton-personalized-picks')).toBeNull();
  });

  it('shows personalized-picks skeleton while quiz recommendations are loading', () => {
    mockUsePersonalization.mockReturnValue({ ...noPersonalization, isLoading: true });
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('skeleton-personalized-picks')).toBeTruthy();
  });

  it('shows personalized-picks when quiz recommendations are loaded', () => {
    mockUsePersonalization.mockReturnValue({
      sommelierResult: null,
      recommendations: [
        {
          id: 'p1',
          slug: 'asheville-full',
          name: 'Asheville Full',
          price: 349,
          images: [],
          category: 'futon',
          description: '',
          isFeatured: false,
          rating: 4.5,
          reviewCount: 10,
          sizeOptions: [],
        },
      ],
      topStyle: null,
      isLoading: false,
      error: null,
    });
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('personalized-picks')).toBeTruthy();
  });
});

// ─── Featured products empty ──────────────────────────────────────────────────

describe('featured products empty', () => {
  it('"Shop the Look" section is not rendered when no featured collections and not loading', () => {
    mockUseCollections.mockReturnValue(collectionsEmpty);
    const { queryByText } = renderHomeScreen();
    expect(queryByText('Shop the Look')).toBeNull();
  });

  it('"Shop the Look" section IS rendered when featured collections are loaded', () => {
    mockUseCollections.mockReturnValue(collectionsLoaded);
    const { getByText } = renderHomeScreen();
    expect(getByText('Shop the Look')).toBeTruthy();
  });

  it('collection carousel is absent when featured is empty and not loading', () => {
    mockUseCollections.mockReturnValue(collectionsEmpty);
    const { queryByTestId } = renderHomeScreen();
    expect(queryByTestId('collection-carousel')).toBeNull();
  });
});

// ─── Offline skeleton ─────────────────────────────────────────────────────────

describe('offline skeleton (collections loading)', () => {
  it('shows skeleton row while collections are loading and featured is empty', () => {
    mockUseCollections.mockReturnValue({
      ...collectionsEmpty,
      isLoading: true,
    });
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('skeleton-carousel-row')).toBeTruthy();
  });

  it('"Shop the Look" header shows during loading (skeleton appears under heading)', () => {
    mockUseCollections.mockReturnValue({
      ...collectionsEmpty,
      isLoading: true,
    });
    const { getByText } = renderHomeScreen();
    expect(getByText('Shop the Look')).toBeTruthy();
  });

  it('skeleton row is NOT shown when collections are loaded', () => {
    mockUseCollections.mockReturnValue(collectionsLoaded);
    const { queryByTestId } = renderHomeScreen();
    expect(queryByTestId('skeleton-carousel-row')).toBeNull();
  });
});

// ─── Banner CTA ───────────────────────────────────────────────────────────────

describe('banner CTA', () => {
  it('shows promo banner skeleton when promoLoading is true', () => {
    mockUsePromotion.mockReturnValue({ items: [], isLoading: true });
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('promo-banner-skeleton')).toBeTruthy();
  });

  it('shows promo banner carousel when items are available and not loading', () => {
    mockUsePromotion.mockReturnValue({ items: [PROMO_ITEM], isLoading: false });
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('promo-banner-carousel')).toBeTruthy();
  });

  it('promo banner item renders with correct testID', () => {
    mockUsePromotion.mockReturnValue({ items: [PROMO_ITEM], isLoading: false });
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('promo-banner-promo-free-shipping')).toBeTruthy();
  });

  it('skeleton is NOT shown when promoLoading is false', () => {
    mockUsePromotion.mockReturnValue({ items: [PROMO_ITEM], isLoading: false });
    const { queryByTestId } = renderHomeScreen();
    expect(queryByTestId('promo-banner-skeleton')).toBeNull();
  });
});

// ─── Refresh error ────────────────────────────────────────────────────────────

describe('refresh error', () => {
  it('shows "Couldn\'t refresh content" when collections fetch errors', () => {
    mockUseCollections.mockReturnValue({
      ...collectionsLoaded,
      isStale: true,
      error: new Error('Network error'),
    });
    const { getByText } = renderHomeScreen();
    expect(getByText("Couldn't refresh content. Showing saved data.")).toBeTruthy();
  });

  it('error banner shows while stale collections remain visible', () => {
    mockUseCollections.mockReturnValue({
      ...collectionsLoaded,
      isStale: true,
      error: new Error('Network error'),
    });
    const { getByTestId, getByText } = renderHomeScreen();
    expect(getByTestId('home-connection-error')).toBeTruthy();
    expect(getByText('Mountain Lodge Living')).toBeTruthy();
  });

  it('error banner is absent when no error and collections loaded', () => {
    mockUseCollections.mockReturnValue(collectionsLoaded);
    const { queryByTestId } = renderHomeScreen();
    expect(queryByTestId('home-connection-error')).toBeNull();
  });

  it('error banner shows when featured is empty and error occurs', () => {
    mockUseCollections.mockReturnValue({
      ...collectionsEmpty,
      error: new Error('Network error'),
    });
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('home-connection-error')).toBeTruthy();
  });
});

// ─── Skeleton section titles (SkeletonBox/SkeletonText integration) ───────────

describe('skeleton section titles', () => {
  it('shows skeleton title placeholder when collections are loading and featured is empty', () => {
    mockUseCollections.mockReturnValue({ ...collectionsEmpty, isLoading: true });
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('skeleton-collections-title')).toBeTruthy();
  });

  it('does NOT show skeleton title when collections are loaded', () => {
    mockUseCollections.mockReturnValue(collectionsLoaded);
    const { queryByTestId } = renderHomeScreen();
    expect(queryByTestId('skeleton-collections-title')).toBeNull();
  });

  it('shows skeleton title placeholder when quiz recommendations are loading', () => {
    mockUsePersonalization.mockReturnValue({ ...noPersonalization, isLoading: true });
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('skeleton-picks-title')).toBeTruthy();
  });

  it('does NOT show skeleton picks title when quiz is loaded', () => {
    mockUsePersonalization.mockReturnValue({
      sommelierResult: null,
      recommendations: [
        {
          id: 'p1',
          slug: 'asheville-full',
          name: 'Asheville Full',
          price: 349,
          images: [],
          category: 'futon',
          description: '',
          isFeatured: false,
          rating: 4.5,
          reviewCount: 10,
          sizeOptions: [],
        },
      ],
      topStyle: null,
      isLoading: false,
      error: null,
    });
    const { queryByTestId } = renderHomeScreen();
    expect(queryByTestId('skeleton-picks-title')).toBeNull();
  });
});
