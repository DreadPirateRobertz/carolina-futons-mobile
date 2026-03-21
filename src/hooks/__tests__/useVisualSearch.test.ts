/**
 * cm-21k — useVisualSearch hook tests (TDD)
 *
 * Written BEFORE implementation. All should fail until Task 4 is complete.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useVisualSearch } from '../useVisualSearch';
import * as ImagePicker from 'expo-image-picker';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
  ImagePickerResult: {},
}));

const mockCallVisualSearch = jest.fn();
jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: jest.fn(() => ({
    callVisualSearch: mockCallVisualSearch,
  })),
}));

jest.mock('@/data/products', () => {
  const { PRODUCTS } = jest.requireActual('@/data/products');
  return { PRODUCTS };
});

const CANCELLED_RESULT = { canceled: true, assets: null };
const IMAGE_RESULT = {
  canceled: false,
  assets: [{ base64: 'abc123', uri: 'file://photo.jpg' }],
};
const AI_RESPONSE = {
  category: 'futons',
  style: 'modern',
  colorFamily: 'neutral',
  keywords: ['sofa', 'convertible'],
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useVisualSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue(IMAGE_RESULT);
    mockCallVisualSearch.mockResolvedValue(AI_RESPONSE);
  });

  it('starts in idle state with empty results', () => {
    const { result } = renderHook(() => useVisualSearch());
    expect(result.current.status).toBe('idle');
    expect(result.current.results).toEqual([]);
    expect(result.current.query).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('stays idle when picker is cancelled', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue(CANCELLED_RESULT);
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => {
      await result.current.trigger();
    });
    expect(result.current.status).toBe('idle');
  });

  it('transitions to loading while awaiting backend', async () => {
    let resolveBackend!: (v: typeof AI_RESPONSE) => void;
    mockCallVisualSearch.mockReturnValue(
      new Promise((r) => {
        resolveBackend = r;
      }),
    );

    const { result } = renderHook(() => useVisualSearch());
    act(() => {
      result.current.trigger();
    });

    await waitFor(() => expect(result.current.status).toBe('loading'));
    resolveBackend(AI_RESPONSE);
  });

  it('transitions to success with scored results', async () => {
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => {
      await result.current.trigger();
    });
    expect(result.current.status).toBe('success');
    expect(result.current.results.length).toBeGreaterThan(0);
  });

  it('sets matchType=fallback when no products score >= 1', async () => {
    mockCallVisualSearch.mockResolvedValue({
      category: 'unknown',
      style: 'unknown',
      colorFamily: 'unknown',
      keywords: [],
    });
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => {
      await result.current.trigger();
    });
    expect(result.current.query?.matchType).toBe('fallback');
  });

  it('sets matchType=scored when at least one product scores >= 1', async () => {
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => {
      await result.current.trigger();
    });
    expect(result.current.query?.matchType).toBe('scored');
  });

  it('transitions to error on backend 500', async () => {
    mockCallVisualSearch.mockRejectedValue(new Error('Internal Server Error'));
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => {
      await result.current.trigger();
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBeTruthy();
  });

  it('transitions to error on network timeout', async () => {
    mockCallVisualSearch.mockRejectedValue(new Error('Network timeout'));
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => {
      await result.current.trigger();
    });
    expect(result.current.status).toBe('error');
  });

  it('transitions to error when wixClient is null', async () => {
    const { useOptionalWixClient } = require('@/services/wix/wixProvider');
    (useOptionalWixClient as jest.Mock).mockReturnValueOnce(null);
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => {
      await result.current.trigger();
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('unavailable');
  });

  it('reset() returns to idle with empty results', async () => {
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => {
      await result.current.trigger();
    });
    expect(result.current.status).toBe('success');
    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.results).toEqual([]);
    expect(result.current.query).toBeNull();
  });

  it('calls launchImageLibraryAsync with exif:false', async () => {
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => {
      await result.current.trigger();
    });
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ exif: false }),
    );
  });

  it('calls launchCameraAsync with exif:false when camera mode requested', async () => {
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue(IMAGE_RESULT);
    const { result } = renderHook(() => useVisualSearch());
    await act(async () => {
      await result.current.trigger({ useCamera: true });
    });
    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith(
      expect.objectContaining({ exif: false }),
    );
  });
});
