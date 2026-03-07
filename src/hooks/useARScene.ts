/**
 * @module useARScene
 *
 * Multi-product AR scene manager. Allows placing up to 3 furniture models
 * simultaneously in the AR view, each independently selectable. Tracks
 * total price across all staged items for the "Add All to Cart" action.
 */
import { useState, useCallback, useMemo } from 'react';
import type { FutonModel, Fabric } from '@/data/futons';

const MAX_ITEMS = 3;

export interface SceneItem {
  model: FutonModel;
  fabric: Fabric;
}

export function useARScene() {
  const [items, setItems] = useState<SceneItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.model.basePrice + item.fabric.price, 0),
    [items],
  );

  const canAddMore = items.length < MAX_ITEMS;

  const addItem = useCallback(
    (model: FutonModel, fabric: Fabric): boolean => {
      if (items.length >= MAX_ITEMS) return false;
      setItems((prev) => [...prev, { model, fabric }]);
      setActiveIndex(items.length);
      return true;
    },
    [items.length],
  );

  const removeItem = useCallback(
    (index: number) => {
      setItems((prev) => {
        const next = prev.filter((_, i) => i !== index);
        if (next.length === 0) {
          setActiveIndex(-1);
        } else if (activeIndex >= next.length) {
          setActiveIndex(next.length - 1);
        } else if (activeIndex === index) {
          setActiveIndex(Math.min(index, next.length - 1));
        }
        return next;
      });
    },
    [activeIndex],
  );

  const clearScene = useCallback(() => {
    setItems([]);
    setActiveIndex(-1);
  }, []);

  return {
    items,
    activeIndex,
    totalPrice,
    canAddMore,
    addItem,
    removeItem,
    setActiveIndex,
    clearScene,
  };
}
