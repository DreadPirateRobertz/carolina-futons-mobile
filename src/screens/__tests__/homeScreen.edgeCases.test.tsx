/**
 * HomeScreen edge-case tests — cm-6kf
 *
 * Covers gaps not addressed in homeScreen.test.tsx / homeScreen.deeper.test.tsx:
 *  - Streak badge visibility (streak > 0, loading, zero)
 *  - Recently Viewed section (render, navigation, slice to 10)
 *  - ChallengeDetailSheet open/close
 *  - SommelierHeroCard shown/absent
 *  - Personalization carousel title variants
 *  - AR button default navigation (no override)
 *  - Haptics on native vs web
 */
import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { HomeScreen } from '../HomeScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CompareProvider } from '@/contexts/CompareContext';

// ─── Component stubs ──────────────────────────────────────────────────────────

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
    default: { View, createAnimatedComponent: (c: React.ComponentType) => c },
    useSharedValue: (init: number) => ({ value: init }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSpring: (v: number) => v,
    withSequence: (...vals: number[]) => vals[vals.length - 1],
    withTiming: (v: number) => v,
    withDelay: (_d: number, a: unknown) => a,
    withRepeat: (v: unknown) => v,
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

// ─── Hook stubs ───────────────────────────────────────────────────────────────

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
jest.mock('@/hooks/useCollections', () => ({
  useCollections: () => mockUseCollections(),
}));

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

const mockRefreshChallenges = jest.fn();
const mockUseActiveChallenges = jest.fn();
jest.mock('@/hooks/useActiveChallenges', () => ({
  useActiveChallenges: () => mockUseActiveChallenges(),
}));

jest.mock('@/hooks/useTriggerMoments', () => ({
  useTriggerMoments: () => ({
    triggers: { tierChanged: null, streakDanger: false, challengeCompleted: null },
    dismiss: jest.fn(),
    reportChallengesCompleted: jest.fn(),
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/hooks/useDailyQuests', () => ({
  useDailyQuests: () => ({ quests: [], loading: false, refresh: jest.fn() }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));

const mockUsePersonalization = jest.fn();
jest.mock('@/hooks/usePersonalization', () => ({
  usePersonalization: () => mockUsePersonalization(),
}));

jest.mock('@/hooks/usePromotion', () => ({
  usePromotion: () => ({ items: [], isLoading: false }),
}));

const mockUseRecentlyViewed = jest.fn();
jest.mock('@/hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => mockUseRecentlyViewed(),
}));

const mockUseStreak = jest.fn();
jest.mock('@/hooks/useStreak', () => ({
  useStreak: () => mockUseStreak(),
}));

const mockHapticsImpact = jest.fn();
jest.mock('expo-haptics', () => ({
  impactAsync: (...args: unknown[]) => mockHapticsImpact(...args),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

jest.mock('@/hooks/useInventoryBadge', () => ({
  useInventoryBadge: () => ({ label: null, color: null }),
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

function makeProduct(i: number) {
  return {
    id: `p${i}`,
    slug: `product-${i}`,
    name: `Product ${i}`,
    price: 100 + i,
    images: [],
    category: 'futon',
    description: '',
    isFeatured: false,
    rating: 4.0,
    reviewCount: i,
    sizeOptions: [],
  };
}

function makeChallenge(id: string) {
  return {
    id,
    title: `Challenge ${id}`,
    description: `Do something ${id}`,
    rewardPoints: 100,
    rewardBadge: null,
    progress: 0,
    target: 5,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    isActive: true,
    isCompleted: false,
    actionType: 'browse' as const,
  };
}

const noPersonalization = {
  sommelierResult: null,
  recommendations: [],
  topStyle: null,
  isLoading: false,
  error: null,
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderHomeScreen(props: Partial<React.ComponentProps<typeof HomeScreen>> = {}) {
  return render(
    <NavigationContainer>
      <ThemeProvider>
        <WishlistProvider>
          <CompareProvider>
            <HomeScreen {...props} />
          </CompareProvider>
        </WishlistProvider>
      </ThemeProvider>
    </NavigationContainer>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCollections.mockReturnValue(collectionsLoaded);
  mockUsePersonalization.mockReturnValue(noPersonalization);
  mockUseRecentlyViewed.mockReturnValue({
    recentProducts: [],
    addViewed: jest.fn(),
    clearAll: jest.fn(),
    count: 0,
  });
  mockUseStreak.mockReturnValue({
    streak: 0,
    loading: false,
    wasExtendedToday: false,
    longestStreak: 0,
  });
  mockUseActiveChallenges.mockReturnValue({
    challenges: [],
    loading: false,
    error: null,
    refresh: mockRefreshChallenges,
  });
});

// ─── Streak badge ─────────────────────────────────────────────────────────────

describe('streak badge visibility', () => {
  it('shows streak badge when streak > 0 and not loading', () => {
    mockUseStreak.mockReturnValue({
      streak: 5,
      loading: false,
      wasExtendedToday: false,
      longestStreak: 5,
    });
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('home-streak-badge')).toBeTruthy();
  });

  it('hides streak badge while streak is loading', () => {
    mockUseStreak.mockReturnValue({
      streak: 7,
      loading: true,
      wasExtendedToday: false,
      longestStreak: 7,
    });
    const { queryByTestId } = renderHomeScreen();
    expect(queryByTestId('home-streak-badge')).toBeNull();
  });

  it('hides streak badge when streak is 0 even if not loading', () => {
    mockUseStreak.mockReturnValue({
      streak: 0,
      loading: false,
      wasExtendedToday: false,
      longestStreak: 0,
    });
    const { queryByTestId } = renderHomeScreen();
    expect(queryByTestId('home-streak-badge')).toBeNull();
  });

  it('streak badge shows correct streak count', () => {
    mockUseStreak.mockReturnValue({
      streak: 12,
      loading: false,
      wasExtendedToday: true,
      longestStreak: 12,
    });
    const { getByTestId } = renderHomeScreen();
    const badge = getByTestId('home-streak-badge');
    expect(badge).toBeTruthy();
  });
});

// ─── Recently Viewed section ──────────────────────────────────────────────────

describe('recently viewed section', () => {
  it('shows recently-viewed section when recentProducts has items', () => {
    mockUseRecentlyViewed.mockReturnValue({
      recentProducts: [makeProduct(1), makeProduct(2)],
      addViewed: jest.fn(),
      clearAll: jest.fn(),
      count: 2,
    });
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('recently-viewed-section')).toBeTruthy();
  });

  it('recently-viewed section is absent when recentProducts is empty', () => {
    mockUseRecentlyViewed.mockReturnValue({
      recentProducts: [],
      addViewed: jest.fn(),
      clearAll: jest.fn(),
      count: 0,
    });
    const { queryByTestId } = renderHomeScreen();
    expect(queryByTestId('recently-viewed-section')).toBeNull();
  });

  it('recently-viewed carousel renders when products exist', () => {
    mockUseRecentlyViewed.mockReturnValue({
      recentProducts: [makeProduct(1), makeProduct(2), makeProduct(3)],
      addViewed: jest.fn(),
      clearAll: jest.fn(),
      count: 3,
    });
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('recently-viewed-carousel')).toBeTruthy();
  });

  it('only renders first 10 recently viewed products (slices at 10)', () => {
    const twelveProducts = Array.from({ length: 12 }, (_, i) => makeProduct(i + 1));
    mockUseRecentlyViewed.mockReturnValue({
      recentProducts: twelveProducts,
      addViewed: jest.fn(),
      clearAll: jest.fn(),
      count: 12,
    });
    const { queryByTestId } = renderHomeScreen();
    // product 11 and 12 must be sliced out
    expect(queryByTestId('product-card-p11')).toBeNull();
    expect(queryByTestId('product-card-p12')).toBeNull();
    // product 10 must still be present
    expect(queryByTestId('product-card-p10')).toBeTruthy();
  });

  it('navigates to ProductDetail when a recently viewed product is pressed', async () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
      navigate: mockNavigate,
      setOptions: jest.fn(),
    });
    mockUseRecentlyViewed.mockReturnValue({
      recentProducts: [makeProduct(1)],
      addViewed: jest.fn(),
      clearAll: jest.fn(),
      count: 1,
    });
    const { getByTestId } = renderHomeScreen();
    await act(async () => {
      fireEvent.press(getByTestId('product-card-p1'));
    });
    expect(mockNavigate).toHaveBeenCalledWith('ProductDetail', { slug: 'product-1' });
    jest.restoreAllMocks();
  });
});

// ─── ChallengeDetailSheet open / close ───────────────────────────────────────

describe('ChallengeDetailSheet open/close', () => {
  it('challenge detail sheet is not visible on initial render', () => {
    mockUseActiveChallenges.mockReturnValue({
      challenges: [makeChallenge('ch1')],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { queryByTestId } = renderHomeScreen();
    expect(queryByTestId('challenge-detail-title')).toBeNull();
  });

  it('pressing a challenge card opens the detail sheet', async () => {
    mockUseActiveChallenges.mockReturnValue({
      challenges: [makeChallenge('ch1')],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByTestId } = renderHomeScreen();
    await act(async () => {
      fireEvent.press(getByTestId('challenge-card-ch1'));
    });
    expect(getByTestId('challenge-detail-title')).toBeTruthy();
  });

  it('pressing the close button on the detail sheet closes it', async () => {
    mockUseActiveChallenges.mockReturnValue({
      challenges: [makeChallenge('ch1')],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByTestId, queryByTestId } = renderHomeScreen();
    await act(async () => {
      fireEvent.press(getByTestId('challenge-card-ch1'));
    });
    expect(getByTestId('challenge-detail-title')).toBeTruthy();
    await act(async () => {
      fireEvent.press(getByTestId('challenge-detail-close'));
    });
    expect(queryByTestId('challenge-detail-title')).toBeNull();
  });
});

// ─── SommelierHeroCard ────────────────────────────────────────────────────────

describe('SommelierHeroCard visibility', () => {
  it('shows sommelier hero card when sommelierResult is non-null', async () => {
    mockUsePersonalization.mockReturnValue({
      sommelierResult: { topStyle: 'Coastal', topProducts: [], quizDate: '2026-01-01' },
      recommendations: [],
      topStyle: 'Coastal',
      isLoading: false,
      error: null,
    });
    const { getByTestId } = renderHomeScreen();
    // SommelierHeroCard reads AsyncStorage async before rendering
    await waitFor(() => expect(getByTestId('sommelier-hero-card')).toBeTruthy());
  });

  it('does not show sommelier hero card when sommelierResult is null', async () => {
    mockUsePersonalization.mockReturnValue(noPersonalization);
    const { queryByTestId } = renderHomeScreen();
    await act(async () => {});
    expect(queryByTestId('sommelier-hero-card')).toBeNull();
  });
});

// ─── Personalization carousel title ──────────────────────────────────────────

describe('personalization carousel title', () => {
  it('shows "Your [topStyle] Picks" when sommelierResult has a topStyle', () => {
    mockUsePersonalization.mockReturnValue({
      sommelierResult: { topStyle: 'Coastal', topProducts: [], quizDate: '2026-01-01' },
      recommendations: [makeProduct(1)],
      topStyle: 'Coastal',
      isLoading: false,
      error: null,
    });
    const { getByText } = renderHomeScreen();
    expect(getByText('Your Coastal Picks')).toBeTruthy();
  });

  it('falls back to "Picked for You" when no topStyle from sommelier', () => {
    mockUsePersonalization.mockReturnValue({
      sommelierResult: null,
      recommendations: [makeProduct(1)],
      topStyle: null,
      isLoading: false,
      error: null,
    });
    const { getByText } = renderHomeScreen();
    expect(getByText('Picked for You')).toBeTruthy();
  });
});

// ─── AR button default navigation ────────────────────────────────────────────

describe('AR button default navigation', () => {
  it('navigates to AR screen when AR button pressed and no onOpenAR override', () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
      navigate: mockNavigate,
      setOptions: jest.fn(),
    });
    const { getByTestId } = renderHomeScreen();
    fireEvent.press(getByTestId('home-ar-button'));
    expect(mockNavigate).toHaveBeenCalledWith('AR');
    jest.restoreAllMocks();
  });

  it('does NOT navigate when onOpenAR override is provided', () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
      navigate: mockNavigate,
      setOptions: jest.fn(),
    });
    const onOpenAR = jest.fn();
    const { getByTestId } = renderHomeScreen({ onOpenAR });
    fireEvent.press(getByTestId('home-ar-button'));
    expect(onOpenAR).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalledWith('AR');
    jest.restoreAllMocks();
  });
});

// ─── Haptics ─────────────────────────────────────────────────────────────────

describe('haptics on CTA press', () => {
  it('fires haptic feedback when AR button pressed on native (iOS)', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
    const { getByTestId } = renderHomeScreen({ onOpenAR: jest.fn() });
    fireEvent.press(getByTestId('home-ar-button'));
    expect(mockHapticsImpact).toHaveBeenCalledTimes(1);
    Object.defineProperty(Platform, 'OS', {
      value: originalOS,
      writable: true,
      configurable: true,
    });
  });

  it('does NOT fire haptic feedback when AR button pressed on web', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', writable: true, configurable: true });
    const { getByTestId } = renderHomeScreen({ onOpenAR: jest.fn() });
    fireEvent.press(getByTestId('home-ar-button'));
    expect(mockHapticsImpact).not.toHaveBeenCalled();
    Object.defineProperty(Platform, 'OS', {
      value: originalOS,
      writable: true,
      configurable: true,
    });
  });

  it('fires haptic feedback when Shop button pressed on native (android)', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true, configurable: true });
    const { getByTestId } = renderHomeScreen({ onOpenShop: jest.fn() });
    fireEvent.press(getByTestId('home-shop-button'));
    expect(mockHapticsImpact).toHaveBeenCalledTimes(1);
    Object.defineProperty(Platform, 'OS', {
      value: originalOS,
      writable: true,
      configurable: true,
    });
  });

  it('does NOT fire haptic feedback when Shop button pressed on web', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', writable: true, configurable: true });
    const { getByTestId } = renderHomeScreen({ onOpenShop: jest.fn() });
    fireEvent.press(getByTestId('home-shop-button'));
    expect(mockHapticsImpact).not.toHaveBeenCalled();
    Object.defineProperty(Platform, 'OS', {
      value: originalOS,
      writable: true,
      configurable: true,
    });
  });
});
