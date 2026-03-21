import { renderHook, act } from '@testing-library/react-native';

import { useGalleryFallback } from '../useGalleryFallback';

const mockLaunchImageLibraryAsync = jest.fn();
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: any[]) => mockLaunchImageLibraryAsync(...args),
  MediaTypeOptions: { Images: 'Images' },
}));

const mockIsDevice = { value: true };
jest.mock('expo-device', () => ({
  get isDevice() {
    return mockIsDevice.value;
  },
}));

describe('useGalleryFallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDevice.value = true;
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///room-photo.jpg' }],
    });
  });

  it('starts with no image selected', () => {
    const { result } = renderHook(() => useGalleryFallback());
    expect(result.current.imageUri).toBeNull();
    expect(result.current.isGalleryMode).toBe(false);
  });

  it('pickImage launches image library and sets imageUri', async () => {
    const { result } = renderHook(() => useGalleryFallback());

    await act(async () => {
      await result.current.pickImage();
    });

    expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: 'Images' }),
    );
    expect(result.current.imageUri).toBe('file:///room-photo.jpg');
    expect(result.current.isGalleryMode).toBe(true);
  });

  it('handles picker cancellation gracefully', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: [] });

    const { result } = renderHook(() => useGalleryFallback());

    await act(async () => {
      await result.current.pickImage();
    });

    expect(result.current.imageUri).toBeNull();
    expect(result.current.isGalleryMode).toBe(false);
  });

  it('handles picker returning no assets', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: null });

    const { result } = renderHook(() => useGalleryFallback());

    await act(async () => {
      await result.current.pickImage();
    });

    expect(result.current.imageUri).toBeNull();
    expect(result.current.isGalleryMode).toBe(false);
  });

  it('handles picker error gracefully', async () => {
    mockLaunchImageLibraryAsync.mockRejectedValue(new Error('Permission denied'));

    const { result } = renderHook(() => useGalleryFallback());

    await act(async () => {
      await result.current.pickImage();
    });

    expect(result.current.imageUri).toBeNull();
    expect(result.current.isGalleryMode).toBe(false);
  });

  it('clearImage resets to camera mode', async () => {
    const { result } = renderHook(() => useGalleryFallback());

    await act(async () => {
      await result.current.pickImage();
    });
    expect(result.current.isGalleryMode).toBe(true);

    act(() => {
      result.current.clearImage();
    });

    expect(result.current.imageUri).toBeNull();
    expect(result.current.isGalleryMode).toBe(false);
  });

  it('cameraUnavailable is true when not a physical device', () => {
    mockIsDevice.value = false;

    const { result } = renderHook(() => useGalleryFallback());
    expect(result.current.cameraUnavailable).toBe(true);
  });

  it('cameraUnavailable is false on a physical device', () => {
    mockIsDevice.value = true;

    const { result } = renderHook(() => useGalleryFallback());
    expect(result.current.cameraUnavailable).toBe(false);
  });
});
