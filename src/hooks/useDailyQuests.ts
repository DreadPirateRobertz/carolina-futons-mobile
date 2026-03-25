/**
 * @module useDailyQuests
 *
 * Loads today's daily quests from the getMyDailyQuests webMethod (cf-6tv),
 * caches them in AsyncStorage keyed by date, and resets automatically when
 * the date changes (midnight rollover).
 *
 * When Wix client is unavailable (unauthenticated / offline), falls back to
 * static mock quests. Calling refresh() bypasses the cache and re-fetches.
 *
 * cf-mz3
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOptionalWixClient } from '@/services/wix';
import { onQuestRefresh } from '@/services/questRefreshBus';

export type QuestAction =
  | 'purchase'
  | 'review'
  | 'ar'
  | 'wishlist'
  | 'referral'
  | 'browse'
  | 'wishlist_share';

export interface DailyQuest {
  id: string;
  title: string;
  action: QuestAction;
  pointReward: number;
  completed: boolean;
}

interface StoredQuests {
  date: string;
  quests: DailyQuest[];
}

interface ApiQuest {
  id: string;
  title: string;
  action: string;
  pointReward: number;
  completed: boolean;
  completedAt: string | null;
}

interface ApiResponse {
  quests: ApiQuest[];
  date: string;
}

export interface UseDailyQuestsResult {
  quests: DailyQuest[];
  loading: boolean;
  refresh: () => void;
}

const STORAGE_KEY = 'daily-quests';

// Fallback quests — used when unauthenticated or API unavailable
const MOCK_QUESTS: DailyQuest[] = [
  {
    id: 'q-daily-purchase',
    title: 'Browse 3 products',
    action: 'purchase',
    pointReward: 25,
    completed: false,
  },
  {
    id: 'q-daily-review',
    title: 'Write a review',
    action: 'review',
    pointReward: 100,
    completed: false,
  },
  {
    id: 'q-daily-ar',
    title: 'Try AR on a product',
    action: 'ar',
    pointReward: 50,
    completed: false,
  },
];

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function mapApiQuest(api: ApiQuest): DailyQuest {
  return {
    id: api.id,
    title: api.title,
    action: api.action as QuestAction,
    pointReward: api.pointReward,
    completed: api.completed,
  };
}

export function useDailyQuests(): UseDailyQuestsResult {
  const wixClient = useOptionalWixClient();
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (bustCache = false) => {
      setLoading(true);
      try {
        const today = todayDateString();

        // Check cache unless explicitly busting
        if (!bustCache) {
          const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
          if (raw) {
            const stored: StoredQuests = JSON.parse(raw);
            if (stored.date === today) {
              setQuests(stored.quests);
              return;
            }
          }
        }

        // Cache miss, stale, or bust — fetch from API or use mock
        let freshQuests: DailyQuest[];
        if (wixClient) {
          const res = await wixClient.callFunction<ApiResponse>(
            '/_functions/getMyDailyQuests',
            'POST',
            {},
          );
          freshQuests = Array.isArray(res?.quests) ? res.quests.map(mapApiQuest) : MOCK_QUESTS;
        } else {
          freshQuests = MOCK_QUESTS;
        }

        const fresh: StoredQuests = { date: today, quests: freshQuests };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)).catch(() => {});
        setQuests(freshQuests);
      } catch {
        // Any error — fall back to in-memory mock data
        setQuests(MOCK_QUESTS);
      } finally {
        setLoading(false);
      }
    },
    [wixClient],
  );

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    load(true);
  }, [load]);

  // cf-ma6v: subscribe to questRefreshBus so quests re-fetch when a
  // gamification action completes mid-session (e.g. addToCart, review).
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    return onQuestRefresh(() => refreshRef.current());
  }, []);

  return { quests, loading, refresh };
}
