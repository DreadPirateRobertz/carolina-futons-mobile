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
      room: null,
      style: null,
      primaryUse: null,
      colorPalette: null,
      sizePreference: null,
    });
  });

  it('setRoom updates room preference', () => {
    const { result } = renderHook(() => useStyleQuiz());
    act(() => {
      result.current.setRoom('living-room');
    });
    expect(result.current.preferences.room).toBe('living-room');
  });

  it('setStyle updates style preference', () => {
    const { result } = renderHook(() => useStyleQuiz());
    act(() => {
      result.current.setStyle('rustic');
    });
    expect(result.current.preferences.style).toBe('rustic');
  });

  it('setPrimaryUse updates primary use preference', () => {
    const { result } = renderHook(() => useStyleQuiz());
    act(() => {
      result.current.setPrimaryUse('dual-purpose');
    });
    expect(result.current.preferences.primaryUse).toBe('dual-purpose');
  });

  it('setColorPalette updates colorPalette preference', () => {
    const { result } = renderHook(() => useStyleQuiz());
    act(() => {
      result.current.setColorPalette('cool');
    });
    expect(result.current.preferences.colorPalette).toBe('cool');
  });

  it('setSizePreference updates sizePreference preference', () => {
    const { result } = renderHook(() => useStyleQuiz());
    act(() => {
      result.current.setSizePreference('oversized');
    });
    expect(result.current.preferences.sizePreference).toBe('oversized');
  });

  it('savePreferences writes all 5 fields to AsyncStorage', async () => {
    mockSetItem.mockResolvedValue(undefined);
    const { result } = renderHook(() => useStyleQuiz());

    act(() => {
      result.current.setRoom('bedroom');
      result.current.setStyle('modern');
      result.current.setPrimaryUse('seating');
      result.current.setColorPalette('cool');
      result.current.setSizePreference('standard');
    });

    await act(async () => {
      await result.current.savePreferences();
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      '@carolina_futons_style_preferences',
      JSON.stringify({
        room: 'bedroom',
        style: 'modern',
        primaryUse: 'seating',
        colorPalette: 'cool',
        sizePreference: 'standard',
      }),
    );
  });

  it('handles AsyncStorage write errors gracefully', async () => {
    mockSetItem.mockRejectedValue(new Error('Write error'));
    const { result } = renderHook(() => useStyleQuiz());

    // Should not throw
    await act(async () => {
      await result.current.savePreferences();
    });
  });
});

describe('getRecommendation', () => {
  it('returns Coastal Minimalist for modern + cool', () => {
    const rec = getRecommendation('modern', 'cool');
    expect(rec.label).toBe('Coastal Minimalist');
    expect(rec.productSlugs.length).toBeGreaterThan(0);
  });

  it('returns Warm Industrial for rustic + warm', () => {
    const rec = getRecommendation('rustic', 'warm');
    expect(rec.label).toBe('Warm Industrial');
    expect(rec.productSlugs.length).toBeGreaterThan(0);
  });

  it('returns Classic Comfort for classic + neutral', () => {
    const rec = getRecommendation('classic', 'neutral');
    expect(rec.label).toBe('Classic Comfort');
  });

  it('returns Nordic Minimalist for minimalist + cool', () => {
    const rec = getRecommendation('minimalist', 'cool');
    expect(rec.label).toBe('Nordic Minimalist');
  });

  it('returns a label for every style+colorPalette combination', () => {
    const styles = ['modern', 'rustic', 'classic', 'minimalist'] as const;
    const palettes = ['warm', 'cool', 'neutral', 'bold'] as const;
    for (const style of styles) {
      for (const palette of palettes) {
        const rec = getRecommendation(style, palette);
        expect(rec.label).toBeTruthy();
        expect(rec.productSlugs).toBeDefined();
      }
    }
  });

  it('returns productSlugs as non-empty array', () => {
    const rec = getRecommendation('modern', 'cool');
    expect(Array.isArray(rec.productSlugs)).toBe(true);
    expect(rec.productSlugs.length).toBeGreaterThan(0);
  });

  it('returns fallback label for null style', () => {
    const rec = getRecommendation(null, 'cool');
    expect(rec.label).toBeTruthy();
    expect(rec.productSlugs).toBeDefined();
  });

  it('returns fallback label for null colorPalette', () => {
    const rec = getRecommendation('modern', null);
    expect(rec.label).toBeTruthy();
  });
});
