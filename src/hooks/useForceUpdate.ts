/**
 * @module useForceUpdate
 *
 * Checks minimum app version against a remote config endpoint on launch.
 * Returns state for ForceUpdateModal: whether to show it, whether update
 * is required (non-dismissable) vs recommended (dismissable).
 *
 * Uses expo-application for native version info. Falls back gracefully
 * on web or when the fetch fails (never blocks the user on network errors).
 */
import { useState, useEffect, useCallback } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Application from 'expo-application';

const VERSION_CHECK_URL =
  process.env.EXPO_PUBLIC_VERSION_CHECK_URL ?? 'https://api.carolinafutons.com/config/app-version';

interface VersionConfig {
  minimumVersion: string;
  recommendedVersion: string;
}

interface ForceUpdateState {
  visible: boolean;
  required: boolean;
  dismiss: () => void;
}

/** Compare two semver strings. Returns -1, 0, or 1. */
export function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

export async function fetchVersionConfig(url: string): Promise<VersionConfig | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.minimumVersion && data.recommendedVersion) {
      return data as VersionConfig;
    }
    return null;
  } catch {
    return null;
  }
}

export function useForceUpdate(): ForceUpdateState {
  const [visible, setVisible] = useState(false);
  const [required, setRequired] = useState(false);

  const checkVersion = useCallback(async () => {
    // Skip on web or when native version unavailable
    if (Platform.OS === 'web') return;
    const currentVersion = Application.nativeApplicationVersion;
    if (!currentVersion) return;

    const config = await fetchVersionConfig(VERSION_CHECK_URL);
    if (!config) return;

    if (compareSemver(currentVersion, config.minimumVersion) < 0) {
      setRequired(true);
      setVisible(true);
    } else if (compareSemver(currentVersion, config.recommendedVersion) < 0) {
      setRequired(false);
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    checkVersion();

    // Re-check when app returns to foreground
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        checkVersion();
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [checkVersion]);

  const dismiss = useCallback(() => {
    if (!required) {
      setVisible(false);
    }
  }, [required]);

  return { visible, required, dismiss };
}
