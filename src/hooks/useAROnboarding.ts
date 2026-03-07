/**
 * @module useAROnboarding
 *
 * Tracks whether the user has seen the AR tutorial overlay. Persists
 * completion state to AsyncStorage so the tutorial only shows on first
 * AR session. Provides step navigation for the multi-step tutorial.
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@carolina_futons_ar_onboarding_complete';
const TOTAL_STEPS = 3;

export interface UseAROnboardingReturn {
  isLoading: boolean;
  hasSeenAROnboarding: boolean;
  completeAROnboarding: () => Promise<void>;
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  prevStep: () => void;
}

export function useAROnboarding(): UseAROnboardingReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenAROnboarding, setHasSeenAROnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        setHasSeenAROnboarding(value === 'true');
      })
      .catch(() => {
        setHasSeenAROnboarding(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const completeAROnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Storage write failed — still mark complete in memory
    }
    setHasSeenAROnboarding(true);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  return {
    isLoading,
    hasSeenAROnboarding,
    completeAROnboarding,
    currentStep,
    totalSteps: TOTAL_STEPS,
    nextStep,
    prevStep,
  };
}
