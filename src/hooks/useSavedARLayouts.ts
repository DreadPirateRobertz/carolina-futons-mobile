/**
 * @module useSavedARLayouts
 *
 * Saves and restores multi-product AR room arrangements.
 * Each layout stores the model+fabric selections that were staged in the AR
 * scene, with an optional screenshot thumbnail. Persists locally via
 * AsyncStorage and syncs to the Wix ARLayouts collection when a memberId is
 * provided (cm-b3b).
 *
 * Usage:
 *   const { layouts, saveLayout, deleteLayout, renameLayout, syncToCloud } =
 *     useSavedARLayouts({ memberId });
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushLayouts, pullLayouts } from '@/services/arLayoutSync';
import { useOptionalWixClient } from '@/services/wix/wixProvider';

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

export interface UseSavedARLayoutsOptions {
  memberId?: string | null;
}

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

/** Merge local + cloud layout arrays. Union by id — cloud item wins on conflict. */
function mergeLayouts(local: SavedARLayout[], cloud: SavedARLayout[]): SavedARLayout[] {
  const byId = new Map<string, SavedARLayout>();
  for (const l of local) byId.set(l.id, l);
  // Cloud items override local items with the same id
  for (const l of cloud) byId.set(l.id, l);
  return Array.from(byId.values());
}

export function useSavedARLayouts(options: UseSavedARLayoutsOptions = {}): UseSavedARLayoutsReturn {
  const { memberId = null } = options;
  const wixClient = useOptionalWixClient();

  const [layouts, setLayouts] = useState<SavedARLayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Load from AsyncStorage on mount; then pull from cloud if authenticated
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Load local data
      let local: SavedARLayout[] = [];
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) local = parsed as SavedARLayout[];
        }
      } catch {
        // corrupt data — start fresh
      }

      if (cancelled) return;

      // 2. Pull cloud data if authenticated
      if (wixClient && memberId) {
        try {
          const cloud = await pullLayouts(wixClient, memberId);
          if (!cancelled) {
            setLayouts(mergeLayouts(local, cloud));
          }
        } catch {
          // [useSavedARLayouts] cloud pull failed — fall back to local
          if (!cancelled) setLayouts(local);
        }
      } else {
        if (!cancelled) setLayouts(local);
      }

      if (!cancelled) setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [wixClient, memberId]);

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
      } catch {
        return null;
      }

      // Auto-sync to cloud after successful local save
      if (wixClient && memberId) {
        try {
          await pushLayouts(wixClient, memberId, next);
          setLastSyncedAt(new Date().toISOString());
        } catch {
          // [useSavedARLayouts] background sync failed — local save succeeded
        }
      }

      return layout;
    },
    [layouts, wixClient, memberId],
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
      const next = layouts.map((l) => (l.id === id ? { ...l, name: newName, updatedAt: now } : l));
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
    if (!wixClient || !memberId) return;

    setSyncStatus('syncing');
    try {
      await pushLayouts(wixClient, memberId, layouts);
      setLastSyncedAt(new Date().toISOString());
      setSyncStatus('idle');
    } catch {
      setSyncStatus('error');
    }
  }, [layouts, wixClient, memberId]);

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
