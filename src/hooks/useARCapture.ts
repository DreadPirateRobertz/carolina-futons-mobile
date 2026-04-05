/**
 * @module useARCapture
 *
 * AR screenshot capture and sharing hook — hq-x7r.
 *
 * Encapsulates the full capture lifecycle for the AR session:
 *   1. capture()       — grabs a PNG of the ViewShot-wrapped AR scene
 *   2. saveToGallery() — saves to device photo library (requests permission)
 *   3. share()         — opens the system share sheet (expo-sharing / Share fallback)
 *
 * saveToGallery and share auto-capture if no screenshot has been taken yet.
 * Previously captured URI is cached so repeat shares don't re-capture.
 *
 * Error semantics:
 *   - 'permission-denied' — MediaLibrary permission rejected by user
 *   - Any other truthy string — unexpected failure message
 *   Errors from share cancellation are silently swallowed.
 */

import { useState, useCallback, useRef } from 'react';
import { Platform, Share } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { events } from '@/services/analytics';

export interface UseARCaptureOptions {
  /** Ref to the ViewShot component wrapping the AR scene. */
  viewShotRef: { current: unknown };
  /** Analytics context — modelId and fabricId for tracking events. */
  modelId?: string;
  fabricId?: string;
}

export type ARSaveStatus = 'saved' | null;

export interface UseARCaptureResult {
  /** Takes a PNG screenshot of the AR scene. Returns URI or null on failure. */
  capture: () => Promise<string | null>;
  /** Saves screenshot to device photo library. Auto-captures if needed. */
  saveToGallery: () => Promise<void>;
  /** Opens system share sheet with the screenshot. Auto-captures if needed. */
  share: (message?: string) => Promise<void>;
  /** True while captureRef is running. */
  isCapturing: boolean;
  /** URI of the most recent successful capture, or null. */
  lastCapturedUri: string | null;
  /**
   * 'permission-denied' when MediaLibrary access was rejected.
   * Any other string on unexpected failures. Null when no error.
   */
  error: string | null;
  /** 'saved' after a successful saveToGallery, null otherwise. */
  saveStatus: ARSaveStatus;
  /** Clears the current error state. */
  clearError: () => void;
}

export function useARCapture({
  viewShotRef,
  modelId,
  fabricId,
}: UseARCaptureOptions): UseARCaptureResult {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCapturedUri, setLastCapturedUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<ARSaveStatus>(null);

  // Keep lastCapturedUri accessible in callbacks without stale closure
  const lastUriRef = useRef<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const capture = useCallback(async (): Promise<string | null> => {
    if (!viewShotRef.current) {
      setError('AR view is not ready');
      return null;
    }

    setIsCapturing(true);
    setError(null);

    try {
      const uri = await captureRef(viewShotRef, { format: 'png', quality: 1 });

      setLastCapturedUri(uri);
      lastUriRef.current = uri;

      if (modelId && fabricId) events.arScreenshot(modelId, fabricId);

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      return uri;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Capture failed');
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [viewShotRef, modelId, fabricId]);

  const saveToGallery = useCallback(async (): Promise<void> => {
    // Resolve URI — reuse cached or auto-capture
    let uri = lastUriRef.current;
    if (!uri) {
      uri = await capture();
      if (!uri) return; // capture failed — error already set
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('permission-denied');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);

      setSaveStatus('saved');
      if (modelId && fabricId) events.arSaveToGallery(modelId, fabricId);

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }, [capture, modelId, fabricId]);

  const share = useCallback(
    async (message?: string): Promise<void> => {
      // Resolve URI — reuse cached or auto-capture
      let uri = lastUriRef.current;
      if (!uri) {
        uri = await capture();
        if (!uri) return; // capture failed — error already set
      }

      try {
        if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Share your AR view',
          });
        } else {
          await Share.share({ message: message ?? '', url: uri });
        }

        if (modelId && fabricId) events.arShare(modelId, fabricId);
      } catch {
        // Share cancellation or sheet dismissal — not an error the user needs to see
      }
    },
    [capture, modelId, fabricId],
  );

  return {
    capture,
    saveToGallery,
    share,
    isCapturing,
    lastCapturedUri,
    error,
    saveStatus,
    clearError,
  };
}
