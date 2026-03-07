import { renderHook, act } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
import { useCameraPermission, type CameraPermissionState } from '../useCameraPermission';

// Mock expo-camera
const mockRequestPermission = jest.fn();
const mockPermission = { granted: false, canAskAgain: true, status: 'undetermined' };
jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [mockPermission, mockRequestPermission],
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openSettings: jest.fn().mockResolvedValue(undefined),
}));

describe('useCameraPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermission.granted = false;
    mockPermission.canAskAgain = true;
    mockPermission.status = 'undetermined';
  });

  it('returns "undetermined" when permission not yet requested', () => {
    const { result } = renderHook(() => useCameraPermission());
    expect(result.current.state).toBe('undetermined');
    expect(result.current.granted).toBe(false);
  });

  it('returns "granted" when permission is granted', () => {
    mockPermission.granted = true;
    mockPermission.status = 'granted';
    const { result } = renderHook(() => useCameraPermission());
    expect(result.current.state).toBe('granted');
    expect(result.current.granted).toBe(true);
  });

  it('returns "denied" when permission denied but can ask again', () => {
    mockPermission.granted = false;
    mockPermission.canAskAgain = true;
    mockPermission.status = 'denied';
    const { result } = renderHook(() => useCameraPermission());
    expect(result.current.state).toBe('denied');
  });

  it('returns "denied-permanently" when canAskAgain is false', () => {
    mockPermission.granted = false;
    mockPermission.canAskAgain = false;
    mockPermission.status = 'denied';
    const { result } = renderHook(() => useCameraPermission());
    expect(result.current.state).toBe('denied-permanently');
  });

  it('request() calls the expo permission request', async () => {
    mockRequestPermission.mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted' });
    const { result } = renderHook(() => useCameraPermission());
    await act(async () => {
      await result.current.request();
    });
    expect(mockRequestPermission).toHaveBeenCalled();
  });

  it('openSettings() calls Linking.openSettings', async () => {
    mockPermission.granted = false;
    mockPermission.canAskAgain = false;
    mockPermission.status = 'denied';
    const { result } = renderHook(() => useCameraPermission());
    await act(async () => {
      await result.current.openSettings();
    });
    expect(Linking.openSettings).toHaveBeenCalled();
  });

  it('provides platform-aware explanation text', () => {
    const { result } = renderHook(() => useCameraPermission());
    expect(result.current.explanation).toBeTruthy();
    expect(typeof result.current.explanation).toBe('string');
  });

  it('settingsInstructions provides guidance for permanently denied', () => {
    mockPermission.granted = false;
    mockPermission.canAskAgain = false;
    mockPermission.status = 'denied';
    const { result } = renderHook(() => useCameraPermission());
    expect(result.current.settingsInstructions).toBeTruthy();
  });
});
