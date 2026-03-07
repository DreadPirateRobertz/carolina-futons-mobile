/**
 * @module useOnboarding
 *
 * Tracks whether the user has completed the first-run onboarding flow.
 * Persists completion state to AsyncStorage so returning users skip
 * straight to the home screen.
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureException } from '@/services/crashReporting';

const STORAGE_KEY = '@carolina_futons_onboarding_complete';

interface UseOnboardingReturn {
  isLoading: boolean;
  hasSeenOnboarding: boolean;
  completeOnboarding: () => Promise<void>;
}

/** Reads onboarding status on mount and exposes a callback to mark it complete. */
export function useOnboarding(): UseOnboardingReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        setHasSeenOnboarding(value === 'true');
      })
      .catch((err) => {
        captureException(err instanceof Error ? err : new Error(String(err)), 'warning', { action: 'onboarding_read' });
        setHasSeenOnboarding(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), 'warning', { action: 'onboarding_write' });
    }
    setHasSeenOnboarding(true);
  }, []);

  return { isLoading, hasSeenOnboarding, completeOnboarding };
}
