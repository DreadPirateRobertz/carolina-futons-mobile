/**
 * @module HomeScreenRecommendations.test
 *
 * TDD stubs — cm-36j Phase 2.2 Smart Recommendations.
 * Tests the personalized picks section on HomeScreen:
 * quiz not taken, skeleton while loading, carousel after load,
 * empty state when no recs, and section hidden if !quizTaken.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { HomeScreen } from '../HomeScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// Minimal mocks — only what HomeScreen transitively requires
jest.mock('@/hooks/useActiveChallenges', () => ({
  useActiveChallenges: () => ({ challenges: [], loading: false, error: null, refresh: jest.fn() }),
}));
jest.mock('@/hooks/useLivingSky', () => ({
  useLivingSky: () => ({
    skyColors: ['#2858A0', '#4878A8', '#88B0C4', '#A4C8DC'],
    glowColors: ['transparent', 'transparent'],
    ridgeColors: { r1: '#1C4454', r2: '#487494', r3: '#7AA4BE', r4: '#AECCD8', tree: '#0C1C26' },
    sunPos: { cx: 524, cy: 52, r: 16, opacity: 1 },
    moonPos: { cx: 200, cy: 200, opacity: 0, phase: 0, shadowOffset: { dx: 0, dy: 0 } },
    starOpacity: 0,
    cloudOpacity: 0,
    birdOpacity: 0,
    fireflyOpacity: 0,
    owlOpacity: 0,
    rimOpacity: 0,
    rimColor: '#FFFCE8',
    navBg: '#fff',
    navText: '#1E2A3A',
    season: 'summer',
    precipitationOpacity: 0,
    precipitationType: 'none',
  }),
}));
jest.mock('@/hooks/useTriggerMoments', () => ({
  useTriggerMoments: () => ({
    triggers: { tierChanged: null, streakDanger: false, challengeCompleted: null },
    dismiss: jest.fn(),
    reportChallengesCompleted: jest.fn(),
  }),
}));
jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('@/hooks/useCollections', () => ({
  useCollections: () => ({ featured: [], collections: [], isLoading: false, error: null }),
}));
jest.mock('@/hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({
    recentProducts: [],
    addViewed: jest.fn(),
    clearAll: jest.fn(),
    count: 0,
  }),
}));
jest.mock('@/components/PromoBannerCarousel', () => ({ PromoBannerCarousel: () => null }));
jest.mock('@/components/CompareFAB', () => ({ CompareFAB: () => null }));
jest.mock('@/components/ProductCard', () => ({ ProductCard: () => null }));
jest.mock('@/components/MountainSkyline', () => ({ MountainSkyline: () => null }));
jest.mock('@/components/GlassCard', () => ({ GlassCard: ({ children }: any) => children }));
jest.mock('@/components/CollectionCard', () => ({ CollectionCard: () => null }));

// Quiz recommendations mock — controlled per test
const mockQuizRecs = jest.fn();
jest.mock('@/hooks/useQuizRecommendations', () => ({
  useQuizRecommendations: () => mockQuizRecs(),
}));

const mockProduct = (id: string) => ({
  id,
  name: `Product ${id}`,
  slug: `product-${id}`,
  price: 399,
  category: 'futons',
  fabricOptions: [],
  images: [],
  rating: 4.0,
  reviewCount: 5,
  description: '',
  inStock: true,
  featured: false,
});

function renderHome() {
  return render(
    <ThemeProvider>
      <HomeScreen />
    </ThemeProvider>,
  );
}

describe('HomeScreen — personalized recommendations section', () => {
  describe('quiz not taken', () => {
    beforeEach(() => {
      mockQuizRecs.mockReturnValue({
        isLoading: false,
        recommendations: [],
        quizTaken: false,
        label: '',
        error: null,
      });
    });

    it('does not show personalized picks section when quiz not taken', () => {
      const { queryByTestId } = renderHome();
      expect(queryByTestId('personalized-picks')).toBeNull();
    });

    it('does not show personalized skeleton when quiz not taken', () => {
      const { queryByTestId } = renderHome();
      expect(queryByTestId('skeleton-personalized-picks')).toBeNull();
    });
  });

  describe('loading state (quiz taken)', () => {
    beforeEach(() => {
      mockQuizRecs.mockReturnValue({
        isLoading: true,
        recommendations: [],
        quizTaken: true,
        label: 'Coastal Minimalist',
        error: null,
      });
    });

    it('shows skeleton while loading quiz recommendations', () => {
      const { getByTestId } = renderHome();
      expect(getByTestId('skeleton-personalized-picks')).toBeTruthy();
    });

    it('does not show carousel while loading', () => {
      const { queryByTestId } = renderHome();
      expect(queryByTestId('personalized-picks-carousel')).toBeNull();
    });
  });

  describe('loaded with recommendations', () => {
    beforeEach(() => {
      mockQuizRecs.mockReturnValue({
        isLoading: false,
        recommendations: [mockProduct('a'), mockProduct('b')],
        quizTaken: true,
        label: 'Coastal Minimalist',
        error: null,
      });
    });

    it('shows personalized picks section', () => {
      const { getByTestId } = renderHome();
      expect(getByTestId('personalized-picks')).toBeTruthy();
    });

    it('does not show skeleton after load', () => {
      const { queryByTestId } = renderHome();
      expect(queryByTestId('skeleton-personalized-picks')).toBeNull();
    });

    it('renders RecommendationCarousel with personalized picks', () => {
      const { getByTestId } = renderHome();
      expect(getByTestId('personalized-picks-carousel')).toBeTruthy();
    });
  });

  describe('loaded with empty recommendations', () => {
    beforeEach(() => {
      mockQuizRecs.mockReturnValue({
        isLoading: false,
        recommendations: [],
        quizTaken: true,
        label: 'Coastal Minimalist',
        error: null,
      });
    });

    it('hides section when quiz taken but no recommendations', () => {
      const { queryByTestId } = renderHome();
      expect(queryByTestId('personalized-picks')).toBeNull();
    });
  });
});
