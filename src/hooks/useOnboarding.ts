import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@carolina_futons_onboarding_complete';

interface UseOnboardingReturn {
  isLoading: boolean;
  hasSeenOnboarding: boolean;
  completeOnboarding: () => Promise<void>;
}

export function useOnboarding(): UseOnboardingReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        setHasSeenOnboarding(value === 'true');
      })
      .catch(() => {
        setHasSeenOnboarding(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Storage write failed — still mark complete in memory
    }
    setHasSeenOnboarding(true);
  }, []);

  return { isLoading, hasSeenOnboarding, completeOnboarding };
}
