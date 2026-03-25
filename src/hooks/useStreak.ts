/**
 * @module useStreak
 *
 * Tracks consecutive daily visit streak using AsyncStorage.
 * Increments streak when last visit was yesterday; resets if gap > 1 day;
 * preserves streak when already visited today (no double-count).
 * cm-ihz
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@carolina_futons_streak';

interface StreakRecord {
  lastVisit: string; // ISO date string YYYY-MM-DD
  streak: number;
  longestStreak?: number; // cf-qsxp: historical max streak (absent in legacy records)
}

function toDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0];
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

export interface UseStreakResult {
  streak: number;
  loading: boolean;
  /** True only when this session extended the streak (gap from last visit was exactly 1 day). */
  wasExtendedToday: boolean;
  /** cf-qsxp: Historical best streak — survives streak breaks. */
  longestStreak: number;
}

export function useStreak(): UseStreakResult {
  const [streak, setStreak] = useState(1);
  const [longestStreak, setLongestStreak] = useState(1);
  const [loading, setLoading] = useState(true);
  const [wasExtendedToday, setWasExtendedToday] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const today = toDateString(Date.now());
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;

        if (!raw) {
          // First ever visit
          setStreak(1);
          setLongestStreak(1);
          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ lastVisit: today, streak: 1, longestStreak: 1 }),
          );
          return;
        }

        const record: StreakRecord = JSON.parse(raw);
        // cf-qsxp: migrate legacy records that lack longestStreak
        const recordLongest = record.longestStreak ?? record.streak;

        if (record.lastVisit === today) {
          // Already counted today
          setStreak(record.streak);
          setLongestStreak(recordLongest);
          return;
        }

        const gap = daysBetween(record.lastVisit, today);
        const newStreak = gap === 1 ? record.streak + 1 : 1;
        const newLongest = Math.max(recordLongest, newStreak);
        if (gap === 1) setWasExtendedToday(true);
        setStreak(newStreak);
        setLongestStreak(newLongest);
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ lastVisit: today, streak: newStreak, longestStreak: newLongest }),
        );
      } catch {
        // Storage unavailable — fall back to streak of 1
        if (!cancelled) {
          setStreak(1);
          setLongestStreak(1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  return { streak, loading, wasExtendedToday, longestStreak };
}
