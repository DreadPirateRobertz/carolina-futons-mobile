/**
 * @module useQuizRecommendations.test
 *
 * TDD stubs — cm-36j Phase 2.2 Style Quiz Recommendations.
 * Tests quiz preference loading, Wix querying, 1hr TTL cache,
 * fallback behavior, and edge cases.
 */
import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuizRecommendations, clearQuizRecommendationsCache } from '../useQuizRecommendations';

const STORAGE_KEY = '@carolina_futons_style_preferences';

const mockQueryProducts = jest.fn();
const mockUseOptionalWixClient = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

const mockProduct = (overrides: Partial<{ id: string; price: number; category: string }> = {}) => ({
  id: overrides.id ?? 'prod-1',
  name: 'Test Futon',
  slug: overrides.id ?? 'test-futon',
  price: overrides.price ?? 499,
  category: overrides.category ?? 'futons',
  fabricOptions: ['Natural Linen'],
  images: [],
  rating: 4.5,
  reviewCount: 10,
  description: 'A futon',
  inStock: true,
  featured: false,
});

const modernFullPrefs = {
  roomType: 'living-room',
  stylePreference: 'modern',
  primaryUse: 'both',
  sizeNeeds: 'full',
  budgetRange: 'under-500',
};

beforeEach(() => {
  jest.clearAllMocks();
  clearQuizRecommendationsCache();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  mockUseOptionalWixClient.mockReturnValue(null);
});

describe('useQuizRecommendations', () => {
  describe('initial state', () => {
    it('returns isLoading=true initially', () => {
      const { result } = renderHook(() => useQuizRecommendations());
      expect(result.current.isLoading).toBe(true);
    });

    it('returns empty recommendations initially', () => {
      const { result } = renderHook(() => useQuizRecommendations());
      expect(result.current.recommendations).toEqual([]);
    });

    it('returns quizTaken=false initially', () => {
      const { result } = renderHook(() => useQuizRecommendations());
      expect(result.current.quizTaken).toBe(false);
    });
  });

  describe('quiz not taken', () => {
    it('returns quizTaken=false when no preferences stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const { result } = renderHook(() => useQuizRecommendations());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.quizTaken).toBe(false);
    });

    it('returns empty recommendations when quiz not taken', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const { result } = renderHook(() => useQuizRecommendations());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recommendations).toEqual([]);
    });

    it('returns empty label when quiz not taken', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const { result } = renderHook(() => useQuizRecommendations());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.label).toBe('');
    });
  });

  describe('quiz taken — static fallback (no Wix)', () => {
    it('returns quizTaken=true when preferences stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(modernFullPrefs));
      const { result } = renderHook(() => useQuizRecommendations());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.quizTaken).toBe(true);
    });

    it('returns recommendations from static catalog when no Wix client', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(modernFullPrefs));
      const { result } = renderHook(() => useQuizRecommendations());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recommendations.length).toBeGreaterThan(0);
    });

    it('returns recommendation label from getRecommendation matrix', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(modernFullPrefs));
      const { result } = renderHook(() => useQuizRecommendations());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      // modern + full → 'Coastal Minimalist' from RECOMMENDATION_MAP
      expect(result.current.label).toBe('Coastal Minimalist');
    });

    it('returns fallback label when stylePreference/sizeNeeds are null', async () => {
      const partialPrefs = { ...modernFullPrefs, stylePreference: null, sizeNeeds: null };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(partialPrefs));
      const { result } = renderHook(() => useQuizRecommendations());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.label).toBe('Classic Comfort');
    });

    it('has no error in static fallback mode', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(modernFullPrefs));
      const { result } = renderHook(() => useQuizRecommendations());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBeNull();
    });
  });

  describe('quiz taken — Wix query', () => {
    const cheapProduct = mockProduct({ id: 'cheap-1', price: 299 });
    const midProduct = mockProduct({ id: 'mid-1', price: 599 });
    const expensiveProduct = mockProduct({ id: 'exp-1', price: 1499 });

    beforeEach(() => {
      mockQueryProducts.mockResolvedValue({
        products: [cheapProduct, midProduct, expensiveProduct],
        totalResults: 3,
      });
      mockUseOptionalWixClient.mockReturnValue({ queryProducts: mockQueryProducts });
    });

    it('filters products by budget range (under-500)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ ...modernFullPrefs, budgetRange: 'under-500' }),
      );
      const { result } = renderHook(() => useQuizRecommendations());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const ids = result.current.recommendations.map((p) => p.id);
      expect(ids).toContain('cheap-1');
      expect(ids).not.toContain('mid-1');
      expect(ids).not.toContain('exp-1');
    });

    it('filters products by budget range (500-1000)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ ...modernFullPrefs, budgetRange: '500-1000' }),
      );
      const { result } = renderHook(() => useQuizRecommendations());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const ids = result.current.recommendations.map((p) => p.id);
      expect(ids).toContain('mid-1');
      expect(ids).not.toContain('cheap-1');
      expect(ids).not.toContain('exp-1');
    });

    it('falls back to static recs on Wix API failure', async () => {
      mockQueryProducts.mockRejectedValue(new Error('network error'));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(modernFullPrefs));
      const { result } = renderHook(() => useQuizRecommendations());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recommendations.length).toBeGreaterThan(0);
      expect(result.current.error).not.toBeNull();
    });

    it('sets error message on Wix failure', async () => {
      mockQueryProducts.mockRejectedValue(new Error('network error'));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(modernFullPrefs));
      const { result } = renderHook(() => useQuizRecommendations());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toMatch(/useQuizRecommendations/);
    });
  });

  describe('1hr TTL cache', () => {
    it('serves from cache on second call within TTL', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(modernFullPrefs));
      // First render
      const { result: r1 } = renderHook(() => useQuizRecommendations());
      await waitFor(() => expect(r1.current.isLoading).toBe(false));
      const storageCallCount = (AsyncStorage.getItem as jest.Mock).mock.calls.length;

      // Second render — should hit cache, no additional AsyncStorage reads
      const { result: r2 } = renderHook(() => useQuizRecommendations());
      await waitFor(() => expect(r2.current.isLoading).toBe(false));
      expect((AsyncStorage.getItem as jest.Mock).mock.calls.length).toBe(storageCallCount);
    });

    it('re-fetches after TTL expires (1hr)', async () => {
      const realDateNow = Date.now;
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(modernFullPrefs));

      const { result: r1 } = renderHook(() => useQuizRecommendations());
      await waitFor(() => expect(r1.current.isLoading).toBe(false));
      const callsBefore = (AsyncStorage.getItem as jest.Mock).mock.calls.length;

      // Advance time past 1hr TTL
      Date.now = () => realDateNow() + 61 * 60 * 1000;
      clearQuizRecommendationsCache();

      const { result: r2 } = renderHook(() => useQuizRecommendations());
      await waitFor(() => expect(r2.current.isLoading).toBe(false));
      expect((AsyncStorage.getItem as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);

      Date.now = realDateNow;
    });
  });

  describe('AsyncStorage error', () => {
    it('handles AsyncStorage read failure gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('storage error'));
      const { result } = renderHook(() => useQuizRecommendations());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.quizTaken).toBe(false);
      expect(result.current.recommendations).toEqual([]);
    });
  });
});
