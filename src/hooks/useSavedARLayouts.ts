/**
 * @module useSavedARLayouts
 *
 * Saves and restores multi-product AR room arrangements.
 * Each layout stores the model+fabric selections that were staged in the AR
 * scene, with an optional screenshot thumbnail. Persists locally via
 * AsyncStorage and supports optional cloud sync via arLayoutSync.
 *
 * Usage:
 *   const { layouts, saveLayout, deleteLayout, renameLayout, syncToCloud } =
 *     useSavedARLayouts();
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushLayouts } from '@/services/arLayoutSync';

export const MAX_SAVED_LAYOUTS = 10;

const STORAGE_KEY = '@cf_ar_layouts';

export interface SavedARLayoutItem {
  modelId: string;
  fabricId: string;
}

export interface SavedARLayout {
  id: string;
  name: string;
  items: SavedARLayoutItem[];
  thumbnailUri?: string;
  createdAt: string;
  updatedAt: string;
}

type SyncStatus = 'idle' | 'syncing' | 'error';

export interface UseSavedARLayoutsReturn {
  layouts: SavedARLayout[];
  isLoading: boolean;
  saveLayout: (
    name: string,
    items: SavedARLayoutItem[],
    thumbnailUri?: string,
  ) => Promise<SavedARLayout | null>;
  deleteLayout: (id: string) => Promise<void>;
  renameLayout: (id: string, newName: string) => Promise<void>;
  getShareText: (layout: SavedARLayout) => string;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  syncToCloud: () => Promise<void>;
}

function generateId(): string {
  return `ar-layout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function persist(layouts: SavedARLayout[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
}

export function useSavedARLayouts(): UseSavedARLayoutsReturn {
  const [layouts, setLayouts] = useState<SavedARLayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Load from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setLayouts(parsed as SavedARLayout[]);
            }
          } catch {
            // corrupt data — start fresh
          }
        }
      })
      .catch(() => {
        // read failure — start fresh
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const saveLayout = useCallback(
    async (
      name: string,
      items: SavedARLayoutItem[],
      thumbnailUri?: string,
    ): Promise<SavedARLayout | null> => {
      if (layouts.length >= MAX_SAVED_LAYOUTS) return null;

      const now = new Date().toISOString();
      const layout: SavedARLayout = {
        id: generateId(),
        name,
        items,
        ...(thumbnailUri ? { thumbnailUri } : {}),
        createdAt: now,
        updatedAt: now,
      };

      const next = [...layouts, layout];
      try {
        await persist(next);
        setLayouts(next);
        return layout;
      } catch {
        return null;
      }
    },
    [layouts],
  );

  const deleteLayout = useCallback(
    async (id: string): Promise<void> => {
      const next = layouts.filter((l) => l.id !== id);
      try {
        await persist(next);
      } catch {
        // best-effort
      }
      setLayouts(next);
    },
    [layouts],
  );

  const renameLayout = useCallback(
    async (id: string, newName: string): Promise<void> => {
      const now = new Date().toISOString();
      const next = layouts.map((l) =>
        l.id === id ? { ...l, name: newName, updatedAt: now } : l,
      );
      try {
        await persist(next);
      } catch {
        // best-effort
      }
      setLayouts(next);
    },
    [layouts],
  );

  const getShareText = useCallback((layout: SavedARLayout): string => {
    const count = layout.items.length;
    const itemWord = count === 1 ? 'item' : 'items';
    return (
      `Check out my AR room layout "${layout.name}" on Carolina Futons! ` +
      `It has ${count} ${itemWord} arranged. ` +
      `Download the app to see it: carolinafutons.com/app`
    );
  }, []);

  const syncToCloud = useCallback(async (): Promise<void> => {
    setSyncStatus('syncing');
    try {
      await pushLayouts(layouts);
      setLastSyncedAt(new Date().toISOString());
      setSyncStatus('idle');
    } catch {
      setSyncStatus('error');
    }
  }, [layouts]);

  return {
    layouts,
    isLoading,
    saveLayout,
    deleteLayout,
    renameLayout,
    getShareText,
    syncStatus,
    lastSyncedAt,
    syncToCloud,
  };
}
