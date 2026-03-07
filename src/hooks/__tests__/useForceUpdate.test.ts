import { renderHook, act } from '@testing-library/react-native';
import { Platform, AppState } from 'react-native';
import * as Application from 'expo-application';
import { useForceUpdate, compareSemver, fetchVersionConfig } from '../useForceUpdate';

// Mock expo-application with mutable getter
let mockNativeVersion: string | null = '1.0.0';
jest.mock('expo-application', () => ({
  get nativeApplicationVersion() {
    return mockNativeVersion;
  },
}));

// Track AppState listener
let appStateCallback: ((state: string) => void) | null = null;
jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, cb) => {
  appStateCallback = cb as (state: string) => void;
  return { remove: jest.fn() };
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  appStateCallback = null;
  mockNativeVersion = '1.0.0';
  (Platform as { OS: string }).OS = 'ios';
});

describe('compareSemver', () => {
  it('returns 0 for equal versions', () => {
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0);
  });

  it('returns -1 when a < b', () => {
    expect(compareSemver('1.0.0', '1.0.1')).toBe(-1);
    expect(compareSemver('1.0.0', '1.1.0')).toBe(-1);
    expect(compareSemver('1.0.0', '2.0.0')).toBe(-1);
  });

  it('returns 1 when a > b', () => {
    expect(compareSemver('1.0.1', '1.0.0')).toBe(1);
    expect(compareSemver('2.0.0', '1.9.9')).toBe(1);
  });

  it('handles missing patch version', () => {
    expect(compareSemver('1.0', '1.0.0')).toBe(0);
    expect(compareSemver('1.0', '1.0.1')).toBe(-1);
  });
});

describe('fetchVersionConfig', () => {
  it('returns config on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ minimumVersion: '1.0.0', recommendedVersion: '1.1.0' }),
    });
    const result = await fetchVersionConfig('https://example.com/version');
    expect(result).toEqual({ minimumVersion: '1.0.0', recommendedVersion: '1.1.0' });
  });

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const result = await fetchVersionConfig('https://example.com/version');
    expect(result).toBeNull();
  });

  it('returns null on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const result = await fetchVersionConfig('https://example.com/version');
    expect(result).toBeNull();
  });

  it('returns null when response lacks required fields', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ minimumVersion: '1.0.0' }),
    });
    const result = await fetchVersionConfig('https://example.com/version');
    expect(result).toBeNull();
  });
});

describe('useForceUpdate', () => {
  it('shows nothing when version is current', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ minimumVersion: '1.0.0', recommendedVersion: '1.0.0' }),
    });
    const { result } = renderHook(() => useForceUpdate());
    await act(async () => {});
    expect(result.current.visible).toBe(false);
    expect(result.current.required).toBe(false);
  });

  it('shows required modal when below minimum', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ minimumVersion: '2.0.0', recommendedVersion: '2.0.0' }),
    });
    const { result } = renderHook(() => useForceUpdate());
    await act(async () => {});
    expect(result.current.visible).toBe(true);
    expect(result.current.required).toBe(true);
  });

  it('shows dismissable modal when below recommended but above minimum', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ minimumVersion: '0.9.0', recommendedVersion: '2.0.0' }),
    });
    const { result } = renderHook(() => useForceUpdate());
    await act(async () => {});
    expect(result.current.visible).toBe(true);
    expect(result.current.required).toBe(false);
  });

  it('dismiss hides modal for recommended updates', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ minimumVersion: '0.9.0', recommendedVersion: '2.0.0' }),
    });
    const { result } = renderHook(() => useForceUpdate());
    await act(async () => {});
    expect(result.current.visible).toBe(true);

    act(() => result.current.dismiss());
    expect(result.current.visible).toBe(false);
  });

  it('dismiss does nothing for required updates', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ minimumVersion: '2.0.0', recommendedVersion: '2.0.0' }),
    });
    const { result } = renderHook(() => useForceUpdate());
    await act(async () => {});
    expect(result.current.visible).toBe(true);

    act(() => result.current.dismiss());
    expect(result.current.visible).toBe(true);
  });

  it('skips check on web platform', async () => {
    (Platform as { OS: string }).OS = 'web';
    const { result } = renderHook(() => useForceUpdate());
    await act(async () => {});
    expect(result.current.visible).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('gracefully handles fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useForceUpdate());
    await act(async () => {});
    expect(result.current.visible).toBe(false);
  });

  it('re-checks on app foreground', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ minimumVersion: '1.0.0', recommendedVersion: '1.0.0' }),
    });
    renderHook(() => useForceUpdate());
    await act(async () => {});
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      appStateCallback?.('active');
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('stays hidden when nativeApplicationVersion is null', async () => {
    mockNativeVersion = null;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ minimumVersion: '2.0.0', recommendedVersion: '2.0.0' }),
    });
    const { result } = renderHook(() => useForceUpdate());
    await act(async () => {});
    expect(result.current.visible).toBe(false);
  });
});
