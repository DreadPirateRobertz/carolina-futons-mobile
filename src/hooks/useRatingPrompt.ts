/**
 * @module useRatingPrompt
 *
 * Manages in-app rating prompts triggered by purchase milestones (3rd purchase)
 * or app open milestones (7th open). Uses expo-store-review for the native
 * store rating dialog. Tracks prompt state in AsyncStorage with a 90-day
 * cooldown between prompts. Users can disable prompts via a settings toggle.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { events } from '@/services/analytics';

const STORAGE_KEY = '@cfutons/rating_prompt';
const PURCHASE_THRESHOLD = 3;
const APP_OPEN_THRESHOLD = 7;
const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

interface RatingState {
  purchaseCount: number;
  appOpenCount: number;
  lastPromptedAt: number | null;
  disabled: boolean;
}

const DEFAULT_STATE: RatingState = {
  purchaseCount: 0,
  appOpenCount: 0,
  lastPromptedAt: null,
  disabled: false,
};

function isWithinCooldown(lastPromptedAt: number | null): boolean {
  if (lastPromptedAt === null) return false;
  return Date.now() - lastPromptedAt < COOLDOWN_MS;
}

async function loadState(): Promise<RatingState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

async function persistState(state: RatingState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silent — non-critical persistence
  }
}

export function useRatingPrompt() {
  const [state, setState] = useState<RatingState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Load persisted state on mount
  useEffect(() => {
    loadState().then((s) => {
      setState(s);
      setLoaded(true);
    });
  }, []);

  // Track app opens via AppState (foreground transitions)
  useEffect(() => {
    if (!loaded || Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const current = stateRef.current;
        const updated = { ...current, appOpenCount: current.appOpenCount + 1 };
        setState(updated);
        persistState(updated);

        // Check if we hit the app open milestone
        if (
          updated.appOpenCount >= APP_OPEN_THRESHOLD &&
          !updated.disabled &&
          !isWithinCooldown(updated.lastPromptedAt)
        ) {
          requestPrompt(updated, 'app_open_milestone');
        }
      }
    });

    return () => subscription.remove();
  }, [loaded]);

  const requestPrompt = useCallback(
    async (currentState: RatingState, trigger: string) => {
      try {
        const available = await StoreReview.isAvailableAsync();
        if (!available) return;

        await StoreReview.requestReview();
        const updated = { ...currentState, lastPromptedAt: Date.now() };
        setState(updated);
        await persistState(updated);
        events.rateApp(trigger);
      } catch {
        // Review dialog failed — non-critical
      }
    },
    [],
  );

  /** Call after a successful purchase. Triggers review prompt at the 3rd purchase. */
  const recordPurchase = useCallback(async () => {
    if (Platform.OS === 'web') return;

    const current = stateRef.current;
    const updated = { ...current, purchaseCount: current.purchaseCount + 1 };
    setState(updated);
    await persistState(updated);

    if (
      updated.purchaseCount >= PURCHASE_THRESHOLD &&
      !updated.disabled &&
      !isWithinCooldown(updated.lastPromptedAt)
    ) {
      await requestPrompt(updated, 'purchase_milestone');
    }
  }, [requestPrompt]);

  /** Toggle the disabled state for rating prompts. */
  const toggleDisabled = useCallback(async () => {
    const current = stateRef.current;
    const updated = { ...current, disabled: !current.disabled };
    setState(updated);
    await persistState(updated);
  }, []);

  return {
    /** Whether rating prompts are disabled by the user. */
    disabled: state.disabled,
    /** Call after a successful purchase to track milestones. */
    recordPurchase,
    /** Toggle the disabled setting. */
    toggleDisabled,
  };
}
