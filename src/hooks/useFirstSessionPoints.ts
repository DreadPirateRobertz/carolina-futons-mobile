/**
 * @module useFirstSessionPoints
 *
 * Fires a one-time gamification bonus event on the user's first app session.
 *
 * Uses AsyncStorage to persist a "done" flag so the event fires exactly once,
 * even if the app is reinstalled or storage is cleared (conservative default:
 * if read fails, we skip the event to avoid duplicate awards).
 *
 * Error behaviour:
 *  - If getItem throws: captureException, skip event (conservative)
 *  - If firstSessionBonus throws: captureException, still write done flag
 *    (prevents retry loops)
 *  - If setItem throws: non-fatal, event was already fired
 *
 * Bead: cfutons_mobile-b0z
 */
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firstSessionBonus } from '@/services/gamification';
import { captureException } from '@/services/crashReporting';

const FIRST_SESSION_STORAGE_KEY = '@cf_first_session_done';

export interface UseFirstSessionPointsResult {
  /** True only during the session where the bonus was first awarded. */
  isFirstSession: boolean;
}

export function useFirstSessionPoints(): UseFirstSessionPointsResult {
  const [isFirstSession, setIsFirstSession] = useState(false);
  // Ref prevents double-fire on StrictMode double-invocation or re-renders
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;

    async function run() {
      // Conservative: if we cannot read storage, skip the event
      let existing: string | null;
      try {
        existing = await AsyncStorage.getItem(FIRST_SESSION_STORAGE_KEY);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      if (existing !== null) {
        // Already completed a prior session — nothing to do
        return;
      }

      // Mark as fired before calling the event (prevents re-entry on re-render)
      firedRef.current = true;
      setIsFirstSession(true);

      // Fire the gamification event
      try {
        firstSessionBonus();
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)));
        // Fall through — still write the done flag to prevent retry loops
      }

      // Persist done flag (non-fatal if this fails)
      try {
        await AsyncStorage.setItem(FIRST_SESSION_STORAGE_KEY, 'done');
      } catch {
        // Ignore — event already fired
      }
    }

    run();
  }, []);

  return { isFirstSession };
}
