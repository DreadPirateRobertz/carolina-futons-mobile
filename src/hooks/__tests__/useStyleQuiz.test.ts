import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStyleQuiz } from '../useStyleQuiz';

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

  it('savePreferences writes to AsyncStorage', async () => {
    mockSetItem.mockResolvedValue(undefined);
    const { result } = renderHook(() => useStyleQuiz());

    act(() => {
      result.current.setRoom('bedroom');
      result.current.setStyle('modern');
      result.current.setPrimaryUse('seating');
    });

    await act(async () => {
      await result.current.savePreferences();
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      '@carolina_futons_style_preferences',
      JSON.stringify({ room: 'bedroom', style: 'modern', primaryUse: 'seating' }),
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
