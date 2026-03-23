import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { HomeScreen } from '../HomeScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

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
  }),
}));

const mockUseCollections = jest.fn();
jest.mock('@/hooks/useCollections', () => {
  const actual = jest.requireActual('@/hooks/useCollections');
  return {
    ...actual,
    useCollections: () => mockUseCollections(),
  };
});

jest.mock('@/services/wix', () => ({
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
}));

function renderHomeScreen(
  props: {
    onOpenAR?: () => void;
    onOpenShop?: () => void;
    onCollectionPress?: (c: any) => void;
  } = {},
) {
  return render(
    <NavigationContainer>
      <ThemeProvider>
        <HomeScreen {...props} />
      </ThemeProvider>
    </NavigationContainer>,
  );
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no active triggers
    mockUseTriggerMoments.mockReturnValue({
      triggers: { tierChanged: null, streakDanger: false },
      dismiss: jest.fn(),
    });
    // Default: collections load with realistic featured data matching static COLLECTIONS
    mockUseCollections.mockReturnValue({
      collections: [
        {
          id: 'c1',
          slug: 'mountain-lodge-living',
          title: 'Mountain Lodge Living',
          subtitle: 'Warm tones, solid wood, peak comfort',
          description: '',
          heroImage: { uri: '', alt: '' },
          mood: [],
          featured: true,
          productIds: [],
        },
        {
          id: 'c2',
          slug: 'guest-room-ready',
          title: 'Guest Room Ready',
          subtitle: 'Impress every overnight visitor',
          description: '',
          heroImage: { uri: '', alt: '' },
          mood: [],
          featured: true,
          productIds: [],
        },
      ],
      featured: [
        {
          id: 'c1',
          slug: 'mountain-lodge-living',
          title: 'Mountain Lodge Living',
          subtitle: 'Warm tones, solid wood, peak comfort',
          description: '',
          heroImage: { uri: '', alt: '' },
          mood: [],
          featured: true,
          productIds: [],
        },
        {
          id: 'c2',
          slug: 'guest-room-ready',
          title: 'Guest Room Ready',
          subtitle: 'Impress every overnight visitor',
          description: '',
          heroImage: { uri: '', alt: '' },
          mood: [],
          featured: true,
          productIds: [],
        },
      ],
      isLoading: false,
      isStale: false,
      error: null,
      refresh: jest.fn(),
    });
  });

  it('renders hero content', () => {
    const { getByText } = renderHomeScreen();
    expect(getByText('Handcrafted in NC')).toBeTruthy();
    expect(getByText(/Carolina/)).toBeTruthy();
    expect(getByText('Handcrafted comfort from the Blue Ridge Mountains')).toBeTruthy();
  });

  it('has testID for screen identification', () => {
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('home-screen')).toBeTruthy();
  });

  it('renders AR CTA button', () => {
    const { getByTestId, getByText } = renderHomeScreen();
    expect(getByTestId('home-ar-button')).toBeTruthy();
    expect(getByText('Try in Your Room')).toBeTruthy();
    expect(getByText('See how our futons fit using your camera')).toBeTruthy();
  });

  it('calls onOpenAR when AR button pressed', () => {
    const onOpenAR = jest.fn();
    const { getByTestId } = renderHomeScreen({ onOpenAR });
    fireEvent.press(getByTestId('home-ar-button'));
    expect(onOpenAR).toHaveBeenCalledTimes(1);
  });

  it('AR button does not crash when onOpenAR not provided', () => {
    const { getByTestId } = renderHomeScreen();
    // Should not throw
    fireEvent.press(getByTestId('home-ar-button'));
  });

  it('AR button has correct accessibility attributes', () => {
    const { getByTestId } = renderHomeScreen();
    const btn = getByTestId('home-ar-button');
    expect(btn.props.accessibilityLabel).toBe('Try futons in your room with AR camera');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('renders Shop CTA button', () => {
    const { getByTestId, getByText } = renderHomeScreen();
    expect(getByTestId('home-shop-button')).toBeTruthy();
    expect(getByText('Browse Products')).toBeTruthy();
    expect(getByText('Futons, covers, mattresses & more')).toBeTruthy();
  });

  it('calls onOpenShop when Shop button pressed', () => {
    const onOpenShop = jest.fn();
    const { getByTestId } = renderHomeScreen({ onOpenShop });
    fireEvent.press(getByTestId('home-shop-button'));
    expect(onOpenShop).toHaveBeenCalledTimes(1);
  });

  it('Shop button does not crash when onOpenShop not provided', () => {
    const { getByTestId } = renderHomeScreen();
    fireEvent.press(getByTestId('home-shop-button'));
  });

  it('Shop button navigates to Tabs/Shop when no override provided (cm-7uu)', () => {
    // Verify navigate is called — mocking useNavigation to capture the call
    const mockNavigate = jest.fn();
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
      navigate: mockNavigate,
      getParent: () => null,
    });
    const { getByTestId } = renderHomeScreen();
    fireEvent.press(getByTestId('home-shop-button'));
    expect(mockNavigate).toHaveBeenCalledWith('Tabs', { screen: 'Shop' });
    jest.restoreAllMocks();
  });

  it('Shop button has correct accessibility', () => {
    const { getByTestId } = renderHomeScreen();
    const btn = getByTestId('home-shop-button');
    expect(btn.props.accessibilityLabel).toBe('Browse our products');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  // Search icon (cm-we6)
  it('renders search icon button', () => {
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('home-search-button')).toBeTruthy();
  });

  it('search icon has correct accessibility', () => {
    const { getByTestId } = renderHomeScreen();
    const btn = getByTestId('home-search-button');
    expect(btn.props.accessibilityRole).toBe('button');
    expect(btn.props.accessibilityLabel).toBe('Search products');
  });

  it('pressing search icon navigates to Search screen (cm-we6)', () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
      navigate: mockNavigate,
      getParent: () => null,
    });
    const { getByTestId } = renderHomeScreen();
    fireEvent.press(getByTestId('home-search-button'));
    expect(mockNavigate).toHaveBeenCalledWith('Search');
    jest.restoreAllMocks();
  });

  it('renders collection carousel section with header', () => {
    const { getByText, getByTestId } = renderHomeScreen();
    expect(getByText('Shop the Look')).toBeTruthy();
    expect(getByTestId('collection-carousel')).toBeTruthy();
  });

  it('renders featured collection cards in carousel', () => {
    const { getByText } = renderHomeScreen();
    expect(getByText('Mountain Lodge Living')).toBeTruthy();
    expect(getByText('Guest Room Ready')).toBeTruthy();
  });

  it('calls onCollectionPress when collection card tapped', () => {
    const onCollectionPress = jest.fn();
    const { getByText } = renderHomeScreen({ onCollectionPress });
    fireEvent.press(getByText('Mountain Lodge Living'));
    expect(onCollectionPress).toHaveBeenCalledTimes(1);
    expect(onCollectionPress).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'mountain-lodge-living' }),
    );
  });

  // Streak danger banner (cm-a7bqj)
  describe('StreakDangerBanner integration', () => {
    it('does not show streak danger banner when streakDanger is false', () => {
      mockUseTriggerMoments.mockReturnValue({
        triggers: { tierChanged: null, streakDanger: false },
        dismiss: jest.fn(),
      });
      const { queryByTestId } = renderHomeScreen();
      expect(queryByTestId('streak-danger-banner')).toBeNull();
    });

    it('shows streak danger banner when streakDanger is true', () => {
      mockUseTriggerMoments.mockReturnValue({
        triggers: { tierChanged: null, streakDanger: true },
        dismiss: jest.fn(),
      });
      const { getByTestId } = renderHomeScreen();
      expect(getByTestId('streak-danger-banner')).toBeTruthy();
    });

    it('pressing dismiss calls dismiss("streakDanger")', () => {
      const mockDismiss = jest.fn();
      mockUseTriggerMoments.mockReturnValue({
        triggers: { tierChanged: null, streakDanger: true },
        dismiss: mockDismiss,
      });
      const { getByTestId } = renderHomeScreen();
      fireEvent.press(getByTestId('streak-danger-dismiss'));
      expect(mockDismiss).toHaveBeenCalledWith('streakDanger');
    });
  });

  describe('Error state (cm-s1y — branded illustration)', () => {
    it('shows connection error banner when collections fetch fails', () => {
      mockUseCollections.mockReturnValue({
        collections: [],
        featured: [],
        isLoading: false,
        isStale: true,
        error: new Error('Network error'),
        refresh: jest.fn(),
      });
      const { getByTestId } = renderHomeScreen();
      expect(getByTestId('home-connection-error')).toBeTruthy();
    });

    it('shows branded mountain illustration in error banner', () => {
      mockUseCollections.mockReturnValue({
        collections: [],
        featured: [],
        isLoading: false,
        isStale: true,
        error: new Error('Network error'),
        refresh: jest.fn(),
      });
      const { getByTestId } = renderHomeScreen();
      expect(getByTestId('home-connection-error-illustration')).toBeTruthy();
    });

    it('does not show error banner when collections load successfully', () => {
      mockUseCollections.mockReturnValue({
        collections: [],
        featured: [],
        isLoading: false,
        isStale: false,
        error: null,
        refresh: jest.fn(),
      });
      const { queryByTestId } = renderHomeScreen();
      expect(queryByTestId('home-connection-error')).toBeNull();
    });

    // cm-1b4: error banner must appear before the "Since 1985" mountain skyline
    // divider so users see it without scrolling.
    it('error banner renders before the mountain skyline divider (above fold)', () => {
      mockUseCollections.mockReturnValue({
        collections: [],
        featured: [],
        isLoading: false,
        isStale: true,
        error: new Error('Network error'),
        refresh: jest.fn(),
      });
      const { toJSON } = renderHomeScreen();
      const json = JSON.stringify(toJSON());
      const errorBannerPos = json.indexOf('"home-connection-error"');
      const dividerPos = json.indexOf('"home-mountain-skyline"');
      expect(errorBannerPos).toBeGreaterThan(-1);
      expect(dividerPos).toBeGreaterThan(-1);
      // Banner must appear before the "Since 1985" divider skyline
      expect(errorBannerPos).toBeLessThan(dividerPos);
    });
  });

  // cfutons_mobile-0lt — gamification trigger toasts
  describe('ChallengeCompletedToast integration', () => {
    it('does not show challenge toast when challengeCompleted is null', () => {
      mockUseTriggerMoments.mockReturnValue({
        triggers: { tierChanged: null, streakDanger: false, challengeCompleted: null },
        dismiss: jest.fn(),
        reportChallengesCompleted: jest.fn(),
      });
      const { queryByTestId } = renderHomeScreen();
      expect(queryByTestId('home-challenge-toast')).toBeNull();
    });

    it('shows challenge toast when challengeCompleted is set', () => {
      mockUseTriggerMoments.mockReturnValue({
        triggers: {
          tierChanged: null,
          streakDanger: false,
          challengeCompleted: { challengeId: 'c1', title: 'Spring Refresh', rewardPoints: 200 },
        },
        dismiss: jest.fn(),
        reportChallengesCompleted: jest.fn(),
      });
      const { getByTestId } = renderHomeScreen();
      expect(getByTestId('home-challenge-toast')).toBeTruthy();
    });

    it('dismisses challenge toast on animation end by calling dismiss("challengeCompleted")', () => {
      const mockDismiss = jest.fn();
      mockUseTriggerMoments.mockReturnValue({
        triggers: {
          tierChanged: null,
          streakDanger: false,
          challengeCompleted: { challengeId: 'c1', title: 'Spring Refresh', rewardPoints: 200 },
        },
        dismiss: mockDismiss,
        reportChallengesCompleted: jest.fn(),
      });
      const { getByTestId } = renderHomeScreen();
      fireEvent(getByTestId('home-challenge-toast'), 'onDismiss');
      expect(mockDismiss).toHaveBeenCalledWith('challengeCompleted');
    });
  });

  describe('TierUpgradeToast integration', () => {
    it('does not show tier upgrade toast when tierChanged is null', () => {
      mockUseTriggerMoments.mockReturnValue({
        triggers: { tierChanged: null, streakDanger: false, challengeCompleted: null },
        dismiss: jest.fn(),
        reportChallengesCompleted: jest.fn(),
      });
      const { queryByTestId } = renderHomeScreen();
      expect(queryByTestId('home-tier-upgrade-toast')).toBeNull();
    });

    it('shows tier upgrade toast when tierChanged is set', () => {
      mockUseTriggerMoments.mockReturnValue({
        triggers: { tierChanged: 'silver', streakDanger: false, challengeCompleted: null },
        dismiss: jest.fn(),
        reportChallengesCompleted: jest.fn(),
      });
      const { getByTestId } = renderHomeScreen();
      expect(getByTestId('home-tier-upgrade-toast')).toBeTruthy();
    });

    it('dismisses tier toast on animation end by calling dismiss("tierChanged")', () => {
      const mockDismiss = jest.fn();
      mockUseTriggerMoments.mockReturnValue({
        triggers: { tierChanged: 'gold', streakDanger: false, challengeCompleted: null },
        dismiss: mockDismiss,
        reportChallengesCompleted: jest.fn(),
      });
      const { getByTestId } = renderHomeScreen();
      fireEvent(getByTestId('home-tier-upgrade-toast'), 'onDismiss');
      expect(mockDismiss).toHaveBeenCalledWith('tierChanged');
    });
  });

  // hq-4wgr3 — useLivingSky wiring
  describe('LivingSkyMountainSkyline wiring', () => {
    it('renders the hero skyline with testID home-hero-skyline', () => {
      const { getByTestId } = renderHomeScreen();
      expect(getByTestId('home-hero-skyline')).toBeTruthy();
    });
  });
});
