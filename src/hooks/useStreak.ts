/**
 * @module useStreak
 *
 * Tracks consecutive daily visit streak using AsyncStorage.
 * Increments streak when last visit was yesterday; resets if gap > 1 day;
 * preserves streak when already visited today (no double-count).
 *
 * Cross-device sync (cm-bti): when memberId + sync functions are provided,
 * reconciles local AsyncStorage with the remote LoyaltyStreak Wix collection.
 * Falls back gracefully to local-only when offline or sync unavailable.
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

/** Remote streak record shape stored in Wix LoyaltyStreak collection (cm-bti). */
export interface RemoteStreakRecord {
  lastActivityDate: string; // ISO date string YYYY-MM-DD
  currentStreak: number;
  longestStreak: number;
}

/** Optional cross-device sync params (cm-bti). Omit entirely for local-only mode. */
export interface StreakSyncParams {
  memberId: string | undefined;
  fetchRemote: (memberId: string) => Promise<RemoteStreakRecord | null>;
  upsertRemote: (memberId: string, data: RemoteStreakRecord) => Promise<void>;
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

export function useStreak(sync?: StreakSyncParams): UseStreakResult {
  const [streak, setStreak] = useState(1);
  const [longestStreak, setLongestStreak] = useState(1);
  const [loading, setLoading] = useState(true);
  const [wasExtendedToday, setWasExtendedToday] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const today = toDateString(Date.now());
      try {
        // ── Load local and (optionally) remote in parallel ──────────────────
        const memberId = sync?.memberId;

        const [raw, remote] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          memberId
            ? sync!.fetchRemote(memberId).catch(() => null) // offline: treat as null
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        // ── Reconcile: pick the best base record ─────────────────────────────
        // "Best" = most recent lastActivityDate; on tie, use higher streak.
        let baseLastVisit: string | null = null;
        let baseStreak = 0;
        let baseLongest = 0;

        if (raw) {
          const local: StreakRecord = JSON.parse(raw);
          baseLastVisit = local.lastVisit;
          baseStreak = local.streak;
          baseLongest = local.longestStreak ?? local.streak;
        }

        if (remote) {
          const remoteDate = remote.lastActivityDate;
          if (
            !baseLastVisit ||
            remoteDate > baseLastVisit ||
            (remoteDate === baseLastVisit && remote.currentStreak > baseStreak)
          ) {
            baseLastVisit = remoteDate;
            baseStreak = remote.currentStreak;
            baseLongest = Math.max(baseLongest, remote.longestStreak);
          }
        }

        // ── Apply today's visit logic ─────────────────────────────────────────
        if (!baseLastVisit) {
          // First ever visit (no local, no remote)
          setStreak(1);
          setLongestStreak(1);
          await writeRecord(today, 1, 1, memberId, sync);
          return;
        }

        if (baseLastVisit === today) {
          // Already counted today — use reconciled values (handles same-day race)
          setStreak(baseStreak);
          setLongestStreak(baseLongest);
          return;
        }

        const gap = daysBetween(baseLastVisit, today);
        const newStreak = gap === 1 ? baseStreak + 1 : 1;
        const newLongest = Math.max(baseLongest, newStreak);
        if (gap === 1) setWasExtendedToday(true);
        setStreak(newStreak);
        setLongestStreak(newLongest);
        await writeRecord(today, newStreak, newLongest, memberId, sync);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { streak, loading, wasExtendedToday, longestStreak };
}

async function writeRecord(
  today: string,
  newStreak: number,
  newLongest: number,
  memberId: string | undefined,
  sync: StreakSyncParams | undefined,
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ lastVisit: today, streak: newStreak, longestStreak: newLongest }),
  );
  if (memberId && sync) {
    try {
      await sync.upsertRemote(memberId, {
        lastActivityDate: today,
        currentStreak: newStreak,
        longestStreak: newLongest,
      });
    } catch {
      // Remote write failure is non-fatal — local record already saved
    }
  }
}
