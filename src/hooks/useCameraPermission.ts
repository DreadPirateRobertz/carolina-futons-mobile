/**
 * @module useCameraPermission
 *
 * Enhanced camera permission hook for AR features. Wraps expo-camera's
 * permission API with UX-friendly state detection:
 * - undetermined: permission not yet requested
 * - granted: camera access allowed
 * - denied: denied but can re-prompt
 * - denied-permanently: user must go to Settings to re-enable
 *
 * Provides platform-aware explanation text and a direct link to Settings
 * for the permanently-denied case.
 */
import { useCallback } from 'react';
import { Linking, Platform } from 'react-native';
import { useCameraPermissions } from 'expo-camera';

export type CameraPermissionState = 'undetermined' | 'granted' | 'denied' | 'denied-permanently';

export interface UseCameraPermissionReturn {
  state: CameraPermissionState;
  granted: boolean;
  request: () => Promise<void>;
  openSettings: () => Promise<void>;
  explanation: string;
  settingsInstructions: string | null;
}

function deriveState(
  permission: { granted: boolean; canAskAgain: boolean; status: string } | null,
): CameraPermissionState {
  if (!permission) return 'undetermined';
  if (permission.granted) return 'granted';
  if (permission.status === 'undetermined') return 'undetermined';
  if (!permission.canAskAgain) return 'denied-permanently';
  return 'denied';
}

export function useCameraPermission(): UseCameraPermissionReturn {
  const [permission, requestPermission] = useCameraPermissions();

  const state = deriveState(permission);

  const request = useCallback(async () => {
    await requestPermission();
  }, [requestPermission]);

  const openSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  const explanation =
    Platform.OS === 'ios'
      ? 'Carolina Futons uses your camera to show furniture in your room using AR. No photos are stored or shared.'
      : 'Carolina Futons needs camera access to place virtual furniture in your room using augmented reality.';

  const settingsInstructions =
    state === 'denied-permanently'
      ? Platform.OS === 'ios'
        ? 'Open Settings > Carolina Futons > Camera and toggle it on.'
        : 'Open Settings > Apps > Carolina Futons > Permissions > Camera and allow access.'
      : null;

  return {
    state,
    granted: state === 'granted',
    request,
    openSettings,
    explanation,
    settingsInstructions,
  };
}
