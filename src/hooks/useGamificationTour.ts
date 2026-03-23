/**
 * useGamificationTour — hq-jlttk
 *
 * Manages first-time gamification tour visibility.
 * Shows once per device; dismissal persisted to AsyncStorage.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const GAMIFICATION_TOUR_KEY = 'gamification_tour_seen';

export interface UseGamificationTourResult {
  visible: boolean;
  loading: boolean;
  dismiss: () => Promise<void>;
}

export function useGamificationTour(): UseGamificationTourResult {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(GAMIFICATION_TOUR_KEY)
      .then((val) => {
        if (!val) setVisible(true);
      })
      .catch(() => {
        // storage unavailable — skip tour silently
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const dismiss = useCallback(async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(GAMIFICATION_TOUR_KEY, '1');
    } catch {
      // non-critical — tour may re-appear on next launch
    }
  }, []);

  return { visible, loading, dismiss };
}
