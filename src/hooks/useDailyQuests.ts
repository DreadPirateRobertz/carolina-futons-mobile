/**
 * @module useDailyQuests
 *
 * Loads today's daily quests, caches them in AsyncStorage keyed by date,
 * and resets automatically when the date changes (midnight rollover).
 *
 * Data source: mock until cf-6tv (getMyDailyQuests webMethod) ships.
 * When cf-6tv lands, replace MOCK_QUESTS with a WixClient.callFunction call.
 *
 * cf-mz3
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type QuestAction = 'purchase' | 'review' | 'ar' | 'wishlist';

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

export interface UseDailyQuestsResult {
  quests: DailyQuest[];
  loading: boolean;
  refresh: () => void;
}

const STORAGE_KEY = 'daily-quests';

// Mock quests — replaced by cf-6tv webMethod when available
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

export function useDailyQuests(): UseDailyQuestsResult {
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = todayDateString();
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored: StoredQuests = JSON.parse(raw);
        if (stored.date === today) {
          setQuests(stored.quests);
          setLoading(false);
          return;
        }
      }
      // Stale or missing — load fresh mock data and persist
      const fresh: StoredQuests = { date: today, quests: MOCK_QUESTS };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      setQuests(MOCK_QUESTS);
    } catch {
      // Storage error — fall back to in-memory mock data
      setQuests(MOCK_QUESTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { quests, loading, refresh: load };
}
