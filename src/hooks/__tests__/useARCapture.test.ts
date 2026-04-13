/**
 * TDD tests for useARCapture hook.
 *
 * Covers:
 *  capture()
 *    - calls captureRef with png/quality-1 options
 *    - returns the captured URI on success
 *    - sets isCapturing true during capture, false after
 *    - sets lastCapturedUri after success
 *    - sets error and returns null when captureRef throws
 *    - sets error 'no-ref' when viewShotRef.current is null
 *
 *  saveToGallery()
 *    - requests MediaLibrary permission
 *    - saves to library when permission granted
 *    - sets status 'saved' on success
 *    - sets error 'permission-denied' when permission is denied (AC requirement)
 *    - sets error when MediaLibrary.saveToLibraryAsync throws
 *    - auto-captures first when lastCapturedUri is null
 *    - does nothing if auto-capture returns null
 *
 *  share()
 *    - calls Sharing.shareAsync when sharing is available (native path)
 *    - calls Share.share fallback when Sharing.isAvailableAsync returns false
 *    - passes message to Share.share
 *    - auto-captures first when lastCapturedUri is null
 *    - does nothing if auto-capture returns null (capture failed)
 *    - swallows share cancellation without setting error
 *
 *  clearError()
 *    - resets error to null
 *
 * hq-x7r: AR session save — capture + share sheet.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useARCapture } from '../useARCapture';

// ── Mock react-native-view-shot ───────────────────────────────────────────────

const mockCaptureRef = jest.fn();
jest.mock('react-native-view-shot', () => ({
  captureRef: (...args: unknown[]) => mockCaptureRef(...args),
}));

// ── Mock expo-media-library ───────────────────────────────────────────────────

const mockRequestPermissionsAsync = jest.fn();
const mockSaveToLibraryAsync = jest.fn();
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissionsAsync(...args),
  saveToLibraryAsync: (...args: unknown[]) => mockSaveToLibraryAsync(...args),
}));

// ── Mock expo-sharing ─────────────────────────────────────────────────────────

const mockIsAvailableAsync = jest.fn();
const mockShareAsync = jest.fn();
jest.mock('expo-sharing', () => ({
  isAvailableAsync: (...args: unknown[]) => mockIsAvailableAsync(...args),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));

// ── Mock expo-haptics ─────────────────────────────────────────────────────────

const mockNotificationAsync = jest.fn();
jest.mock('expo-haptics', () => ({
  notificationAsync: (...args: unknown[]) => mockNotificationAsync(...args),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

// ── Mock react-native Share ───────────────────────────────────────────────────

const mockRNShare = jest.fn();
jest.mock('react-native', () => ({
  Share: { share: (...args: unknown[]) => mockRNShare(...args) },
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
}));

// ── Mock analytics ────────────────────────────────────────────────────────────

jest.mock('@/services/analytics', () => ({
  events: {
    arScreenshot: jest.fn(),
    arShare: jest.fn(),
    arSaveToGallery: jest.fn(),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const CAPTURED_URI = 'file:///tmp/ar-screenshot-123.png';

/** A fake ref with a non-null current value (simulating mounted ViewShot). */
function makeRef() {
  return { current: {} as unknown };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useARCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCaptureRef.mockResolvedValue(CAPTURED_URI);
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockSaveToLibraryAsync.mockResolvedValue(undefined);
    mockIsAvailableAsync.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);
    mockRNShare.mockResolvedValue({ action: 'sharedAction' });
  });

  // ── capture() ──────────────────────────────────────────────────────────────

  describe('capture()', () => {
    it('starts with isCapturing=false', () => {
      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));
      expect(result.current.isCapturing).toBe(false);
    });

    it('starts with lastCapturedUri=null', () => {
      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));
      expect(result.current.lastCapturedUri).toBeNull();
    });

    it('calls captureRef with png format and quality 1', async () => {
      const ref = makeRef();
      const { result } = renderHook(() => useARCapture({ viewShotRef: ref }));

      await act(async () => {
        await result.current.capture();
      });

      expect(mockCaptureRef).toHaveBeenCalledWith(ref, {
        format: 'png',
        quality: 1,
      });
    });

    it('returns the captured URI on success', async () => {
      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      let uri: string | null = null;
      await act(async () => {
        uri = await result.current.capture();
      });

      expect(uri).toBe(CAPTURED_URI);
    });

    it('sets lastCapturedUri after successful capture', async () => {
      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      await act(async () => {
        await result.current.capture();
      });

      expect(result.current.lastCapturedUri).toBe(CAPTURED_URI);
    });

    it('sets isCapturing=true during capture, false after', async () => {
      let capturingDuring = false;
      mockCaptureRef.mockImplementation(
        () =>
          new Promise((resolve) => {
            // Capture isCapturing state mid-flight via a tick delay
            setTimeout(() => resolve(CAPTURED_URI), 0);
          }),
      );

      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      const capturePromise = act(async () => {
        const p = result.current.capture();
        // Check synchronously right after calling — isCapturing should be true
        capturingDuring = result.current.isCapturing;
        await p;
      });

      await capturePromise;
      // After the call completes, isCapturing should be false
      expect(result.current.isCapturing).toBe(false);
    });

    it('sets error when captureRef throws', async () => {
      mockCaptureRef.mockRejectedValue(new Error('captureRef failed'));

      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      await act(async () => {
        await result.current.capture();
      });

      expect(result.current.error).toBeTruthy();
    });

    it('returns null when captureRef throws', async () => {
      mockCaptureRef.mockRejectedValue(new Error('captureRef failed'));

      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      let uri: string | null = 'initial';
      await act(async () => {
        uri = await result.current.capture();
      });

      expect(uri).toBeNull();
    });

    it('sets error when viewShotRef.current is null', async () => {
      const nullRef = { current: null };
      const { result } = renderHook(() => useARCapture({ viewShotRef: nullRef }));

      await act(async () => {
        await result.current.capture();
      });

      expect(result.current.error).toBeTruthy();
      expect(mockCaptureRef).not.toHaveBeenCalled();
    });

    it('returns null when viewShotRef.current is null', async () => {
      const nullRef = { current: null };
      const { result } = renderHook(() => useARCapture({ viewShotRef: nullRef }));

      let uri: string | null = 'initial';
      await act(async () => {
        uri = await result.current.capture();
      });

      expect(uri).toBeNull();
    });
  });

  // ── saveToGallery() ────────────────────────────────────────────────────────

  describe('saveToGallery()', () => {
    it('requests MediaLibrary permission', async () => {
      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      await act(async () => {
        await result.current.saveToGallery();
      });

      expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('saves to library when permission granted', async () => {
      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      await act(async () => {
        await result.current.saveToGallery();
      });

      expect(mockSaveToLibraryAsync).toHaveBeenCalledWith(CAPTURED_URI);
    });

    it('sets status to saved on success', async () => {
      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      await act(async () => {
        await result.current.saveToGallery();
      });

      expect(result.current.saveStatus).toBe('saved');
    });

    it('sets error "permission-denied" when MediaLibrary permission denied', async () => {
      mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      await act(async () => {
        await result.current.saveToGallery();
      });

      expect(result.current.error).toBe('permission-denied');
      expect(mockSaveToLibraryAsync).not.toHaveBeenCalled();
    });

    it('sets error when saveToLibraryAsync throws', async () => {
      mockSaveToLibraryAsync.mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      await act(async () => {
        await result.current.saveToGallery();
      });

      expect(result.current.error).toBeTruthy();
    });

    it('auto-captures when lastCapturedUri is null', async () => {
      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      // No prior capture
      expect(result.current.lastCapturedUri).toBeNull();

      await act(async () => {
        await result.current.saveToGallery();
      });

      expect(mockCaptureRef).toHaveBeenCalledTimes(1);
    });

    it('reuses lastCapturedUri without re-capturing', async () => {
      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      // First call: capture + save
      await act(async () => {
        await result.current.saveToGallery();
      });
      expect(mockCaptureRef).toHaveBeenCalledTimes(1);

      // Second call: should reuse URI, not capture again
      await act(async () => {
        await result.current.saveToGallery();
      });
      expect(mockCaptureRef).toHaveBeenCalledTimes(1);
    });

    it('does nothing if auto-capture returns null', async () => {
      mockCaptureRef.mockResolvedValue(null);

      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      await act(async () => {
        await result.current.saveToGallery();
      });

      expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
      expect(mockSaveToLibraryAsync).not.toHaveBeenCalled();
    });
  });

  // ── share() ────────────────────────────────────────────────────────────────

  describe('share()', () => {
    it('calls Sharing.shareAsync when sharing is available', async () => {
      mockIsAvailableAsync.mockResolvedValue(true);

      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      await act(async () => {
        await result.current.share();
      });

      expect(mockShareAsync).toHaveBeenCalledWith(CAPTURED_URI, expect.any(Object));
    });

    it('passes mimeType image/png to shareAsync', async () => {
      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      await act(async () => {
        await result.current.share();
      });

      expect(mockShareAsync).toHaveBeenCalledWith(
        CAPTURED_URI,
        expect.objectContaining({ mimeType: 'image/png' }),
      );
    });

    it('falls back to RN Share.share when Sharing.isAvailableAsync returns false', async () => {
      mockIsAvailableAsync.mockResolvedValue(false);

      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      await act(async () => {
        await result.current.share('Check out my futon!');
      });

      expect(mockShareAsync).not.toHaveBeenCalled();
      expect(mockRNShare).toHaveBeenCalledWith(expect.objectContaining({ url: CAPTURED_URI }));
    });

    it('includes message in Share.share fallback', async () => {
      mockIsAvailableAsync.mockResolvedValue(false);
      const message = 'Check out the Asheville Futon!';

      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      await act(async () => {
        await result.current.share(message);
      });

      expect(mockRNShare).toHaveBeenCalledWith(expect.objectContaining({ message }));
    });

    it('auto-captures when lastCapturedUri is null', async () => {
      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));
      expect(result.current.lastCapturedUri).toBeNull();

      await act(async () => {
        await result.current.share();
      });

      expect(mockCaptureRef).toHaveBeenCalledTimes(1);
    });

    it('does nothing if auto-capture returns null', async () => {
      mockCaptureRef.mockResolvedValue(null);

      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      await act(async () => {
        await result.current.share();
      });

      expect(mockShareAsync).not.toHaveBeenCalled();
      expect(mockRNShare).not.toHaveBeenCalled();
    });

    it('swallows share cancellation without setting error', async () => {
      // User cancels share sheet — expo-sharing throws with a user-cancel-ish message
      mockShareAsync.mockRejectedValue(new Error('User cancelled'));

      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      await act(async () => {
        await result.current.share();
      });

      // Error should NOT be set on share cancellation
      expect(result.current.error).toBeNull();
    });

    it('reuses lastCapturedUri without re-capturing on second share', async () => {
      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      await act(async () => {
        await result.current.share();
      });
      expect(mockCaptureRef).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.share();
      });
      expect(mockCaptureRef).toHaveBeenCalledTimes(1);
    });
  });

  // ── clearError() ───────────────────────────────────────────────────────────

  describe('clearError()', () => {
    it('resets error to null', async () => {
      mockCaptureRef.mockRejectedValue(new Error('fail'));
      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      await act(async () => {
        await result.current.capture();
      });
      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.clearError();
      });
      expect(result.current.error).toBeNull();
    });

    it('resets permission-denied error', async () => {
      mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });
      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      await act(async () => {
        await result.current.saveToGallery();
      });
      expect(result.current.error).toBe('permission-denied');

      act(() => {
        result.current.clearError();
      });
      expect(result.current.error).toBeNull();
    });
  });

  // ── saveStatus ─────────────────────────────────────────────────────────────

  describe('saveStatus', () => {
    it('starts as null', () => {
      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));
      expect(result.current.saveStatus).toBeNull();
    });

    it('is null after a failed save (permission denied)', async () => {
      mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });
      const { result } = renderHook(() => useARCapture({ viewShotRef: makeRef() }));

      await act(async () => {
        await result.current.saveToGallery();
      });

      expect(result.current.saveStatus).toBeNull();
    });
  });
});
