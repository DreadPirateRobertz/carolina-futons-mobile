import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStyleQuiz, getRecommendation } from '../useStyleQuiz';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

const mockSetItem = AsyncStorage.setItem as jest.Mock;

describe('useStyleQuiz', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts with null preferences', () => {
    const { result } = renderHook(() => useStyleQuiz());
    expect(result.current.preferences).toEqual({
      roomType: null,
      stylePreference: null,
      primaryUse: null,
      sizeNeeds: null,
      budgetRange: null,
    });
  });

  it('setRoomType updates roomType preference', async () => {
    const { result } = renderHook(() => useStyleQuiz());
    await act(async () => {
      result.current.setRoomType('living-room');
    });
    expect(result.current.preferences.roomType).toBe('living-room');
  });

  it('setStylePreference updates stylePreference', async () => {
    const { result } = renderHook(() => useStyleQuiz());
    await act(async () => {
      result.current.setStylePreference('rustic');
    });
    expect(result.current.preferences.stylePreference).toBe('rustic');
  });

  it('setPrimaryUse updates primaryUse', async () => {
    const { result } = renderHook(() => useStyleQuiz());
    await act(async () => {
      result.current.setPrimaryUse('both');
    });
    expect(result.current.preferences.primaryUse).toBe('both');
  });

  it('setSizeNeeds updates sizeNeeds', async () => {
    const { result } = renderHook(() => useStyleQuiz());
    await act(async () => {
      result.current.setSizeNeeds('queen');
    });
    expect(result.current.preferences.sizeNeeds).toBe('queen');
  });

  it('setBudgetRange updates budgetRange', async () => {
    const { result } = renderHook(() => useStyleQuiz());
    await act(async () => {
      result.current.setBudgetRange('500-1000');
    });
    expect(result.current.preferences.budgetRange).toBe('500-1000');
  });

  it('savePreferences writes all 5 fields to AsyncStorage', async () => {
    mockSetItem.mockResolvedValue(undefined);
    const { result } = renderHook(() => useStyleQuiz());

    await act(async () => {
      result.current.setRoomType('bedroom');
      result.current.setStylePreference('modern');
      result.current.setPrimaryUse('sitting');
      result.current.setSizeNeeds('full');
      result.current.setBudgetRange('500-1000');
    });

    await act(async () => {
      await result.current.savePreferences();
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      '@carolina_futons_style_preferences',
      JSON.stringify({
        roomType: 'bedroom',
        stylePreference: 'modern',
        primaryUse: 'sitting',
        sizeNeeds: 'full',
        budgetRange: '500-1000',
      }),
    );
  });

  it('propagates AsyncStorage write errors to callers', async () => {
    mockSetItem.mockRejectedValue(new Error('Write error'));
    const { result } = renderHook(() => useStyleQuiz());

    // savePreferences propagates errors — callers (OnboardingScreen, StyleQuizScreen) handle them
    await expect(
      act(async () => {
        await result.current.savePreferences();
      }),
    ).rejects.toThrow('Write error');
  });
});

describe('getRecommendation', () => {
  it('returns Coastal Minimalist for modern + full', () => {
    const rec = getRecommendation('modern', 'full');
    expect(rec.label).toBe('Coastal Minimalist');
    expect(rec.productSlugs.length).toBeGreaterThan(0);
  });

  it('returns Warm Industrial for rustic + full', () => {
    const rec = getRecommendation('rustic', 'full');
    expect(rec.label).toBe('Warm Industrial');
    expect(rec.productSlugs.length).toBeGreaterThan(0);
  });

  it('returns Classic Comfort for classic + full', () => {
    const rec = getRecommendation('classic', 'full');
    expect(rec.label).toBe('Classic Comfort');
  });

  it('returns Coastal Suite for modern + queen', () => {
    const rec = getRecommendation('modern', 'queen');
    expect(rec.label).toBe('Coastal Suite');
  });

  it('returns a label for every stylePreference×sizeNeeds combination', () => {
    const styles = ['modern', 'rustic', 'classic'] as const;
    const sizes = ['twin', 'full', 'queen'] as const;
    for (const style of styles) {
      for (const size of sizes) {
        const rec = getRecommendation(style, size);
        expect(rec.label).toBeTruthy();
        expect(rec.productSlugs).toBeDefined();
      }
    }
  });

  it('returns productSlugs as non-empty array', () => {
    const rec = getRecommendation('modern', 'full');
    expect(Array.isArray(rec.productSlugs)).toBe(true);
    expect(rec.productSlugs.length).toBeGreaterThan(0);
  });

  it('returns fallback for null stylePreference', () => {
    const rec = getRecommendation(null, 'full');
    expect(rec.label).toBeTruthy();
    expect(rec.productSlugs).toBeDefined();
  });

  it('returns fallback for null sizeNeeds', () => {
    const rec = getRecommendation('modern', null);
    expect(rec.label).toBeTruthy();
  });
});
