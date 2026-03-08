/**
 * @module useStagedItems
 *
 * State management for multiple furniture items placed in an AR scene.
 * Supports adding, removing, selecting, and listing staged items for
 * the multi-product room planning feature.
 */

import { useState, useCallback, useMemo } from 'react';
import type { FutonModel, Fabric } from '@/data/futons';

export interface StagedItem {
  id: string;
  model: FutonModel;
  fabric: Fabric;
  placedAt: number;
}

const MAX_STAGED_ITEMS = 5;

export function useStagedItems() {
  const [items, setItems] = useState<StagedItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const addItem = useCallback(
    (model: FutonModel, fabric: Fabric): StagedItem | null => {
      if (items.length >= MAX_STAGED_ITEMS) return null;

      const item: StagedItem = {
        id: `staged-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        model,
        fabric,
        placedAt: Date.now(),
      };

      setItems((prev) => [...prev, item]);
      setActiveId(item.id);
      return item;
    },
    [items.length],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setActiveId((prev) => (prev === id ? null : prev));
  }, []);

  const selectItem = useCallback((id: string | null) => {
    setActiveId(id);
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    setActiveId(null);
  }, []);

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) ?? null,
    [items, activeId],
  );

  const canAdd = items.length < MAX_STAGED_ITEMS;

  return {
    items,
    activeId,
    activeItem,
    canAdd,
    maxItems: MAX_STAGED_ITEMS,
    addItem,
    removeItem,
    selectItem,
    clearAll,
  };
}
