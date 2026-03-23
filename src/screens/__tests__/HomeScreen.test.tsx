import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { HomeScreen } from '../HomeScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

const mockUseCollections = jest.fn();
jest.mock('@/hooks/useCollections', () => {
  const actual = jest.requireActual('@/hooks/useCollections');
  return {
    ...actual,
    useCollections: () => mockUseCollections(),
  };
});

const mockUseActiveChallenges = jest.fn();
jest.mock('@/hooks/useActiveChallenges', () => ({
  useActiveChallenges: () => mockUseActiveChallenges(),
}));

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => ({
    queryData: jest.fn().mockResolvedValue({ items: [], totalResults: 0 }),
  }),
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
  const NOW = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const MOCK_CHALLENGES = [
    {
      id: 'spring-refresh',
      title: 'Spring Refresh',
      description: 'Browse 5 new arrivals.',
      reward: '500 pts',
      progress: 0.4,
      expiresAt: NOW + 7 * DAY,
      isActive: false,
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
      isActive: false,
      type: 'streak',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: active challenges loaded
    mockUseActiveChallenges.mockReturnValue({
      challenges: MOCK_CHALLENGES,
      loading: false,
      error: null,
      refresh: jest.fn(),
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

  describe('Challenges rail (cm-jyw)', () => {
    it('renders challenges rail when challenges array is non-empty', () => {
      const { getByTestId } = renderHomeScreen();
      expect(getByTestId('challenges-rail')).toBeTruthy();
    });

    it('hides challenges rail when challenges array is empty', () => {
      mockUseActiveChallenges.mockReturnValue({
        challenges: [],
        loading: false,
        error: null,
        refresh: jest.fn(),
      });
      const { queryByTestId } = renderHomeScreen();
      expect(queryByTestId('challenges-rail')).toBeNull();
    });

    it('renders challenge cards for each challenge', () => {
      const { getByTestId } = renderHomeScreen();
      expect(getByTestId('challenge-card-spring-refresh')).toBeTruthy();
      expect(getByTestId('challenge-card-flash-weekend')).toBeTruthy();
      expect(getByTestId('challenge-card-streak-saver')).toBeTruthy();
    });

    it('Flash Weekend card renders ACTIVE badge', () => {
      const { getByTestId } = renderHomeScreen();
      expect(getByTestId('challenge-active-badge-flash-weekend')).toBeTruthy();
    });

    it('renders challenges rail below hero and above collection carousel', () => {
      const { toJSON } = renderHomeScreen();
      const json = JSON.stringify(toJSON());
      const railPos = json.indexOf('"challenges-rail"');
      const carouselPos = json.indexOf('"collection-carousel"');
      expect(railPos).toBeGreaterThan(-1);
      expect(carouselPos).toBeGreaterThan(-1);
      expect(railPos).toBeLessThan(carouselPos);
    });

    it('tapping a challenge card opens the detail sheet', () => {
      const { getByTestId } = renderHomeScreen();
      fireEvent.press(getByTestId('challenge-card-spring-refresh'));
      expect(getByTestId('challenge-detail-sheet')).toBeTruthy();
    });

    it('closing the detail sheet hides it', () => {
      const { getByTestId, queryByTestId } = renderHomeScreen();
      fireEvent.press(getByTestId('challenge-card-spring-refresh'));
      fireEvent.press(getByTestId('challenge-detail-close'));
      expect(queryByTestId('challenge-detail-sheet')).toBeNull();
    });
  });
});
