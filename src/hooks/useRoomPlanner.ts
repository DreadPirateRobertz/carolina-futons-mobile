/**
 * @module useRoomPlanner
 *
 * State management for the Room Planner (cm-62p). Manages room dimensions,
 * placed product silhouettes, and AsyncStorage persistence.
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'room_plan_v1';

export interface PlacedItem {
  /** Unique placement ID (not the product ID — same product can be placed multiple times). */
  id: string;
  productSlug: string;
  productName: string;
  /** Selected fabric color label. */
  fabricColor: string;
  /** Position from left wall in feet. */
  x: number;
  /** Position from top wall in feet. */
  y: number;
  /** Clockwise rotation in degrees. */
  rotation: number;
  /** Product width in feet. */
  widthFt: number;
  /** Product depth in feet. */
  depthFt: number;
}

export interface RoomPlan {
  roomWidth: number;
  roomDepth: number;
  items: PlacedItem[];
  updatedAt: number;
}

const DEFAULT_PLAN: RoomPlan = {
  roomWidth: 12,
  roomDepth: 14,
  items: [],
  updatedAt: Date.now(),
};

/** Inches → feet rounding to 1 decimal place. */
function inchesToFt(inches: number): number {
  return Math.round((inches / 12) * 10) / 10;
}

let placementCounter = 0;
function nextId(): string {
  return `placed-${Date.now()}-${++placementCounter}`;
}

export interface UseRoomPlannerResult {
  plan: RoomPlan;
  isLoaded: boolean;
  setRoomWidth: (w: number) => void;
  setRoomDepth: (d: number) => void;
  addItem: (slug: string, name: string, fabricColor: string, widthIn: number, depthIn: number) => void;
  removeItem: (id: string) => void;
  moveItem: (id: string, x: number, y: number) => void;
  rotateItem: (id: string, rotation: number) => void;
  savePlan: () => Promise<void>;
}

export function useRoomPlanner(): UseRoomPlannerResult {
  const [plan, setPlan] = useState<RoomPlan>(DEFAULT_PLAN);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted plan on mount
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<RoomPlan>;
            if (parsed.roomWidth && parsed.roomDepth) {
              setPlan({ ...DEFAULT_PLAN, ...parsed });
            }
          } catch {
            // Corrupt data — use defaults
          }
        }
        setIsLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setIsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setRoomWidth = useCallback((w: number) => {
    setPlan((prev) => ({ ...prev, roomWidth: w, updatedAt: Date.now() }));
  }, []);

  const setRoomDepth = useCallback((d: number) => {
    setPlan((prev) => ({ ...prev, roomDepth: d, updatedAt: Date.now() }));
  }, []);

  const addItem = useCallback(
    (slug: string, name: string, fabricColor: string, widthIn: number, depthIn: number) => {
      const item: PlacedItem = {
        id: nextId(),
        productSlug: slug,
        productName: name,
        fabricColor,
        x: 1,
        y: 1,
        rotation: 0,
        widthFt: inchesToFt(widthIn),
        depthFt: inchesToFt(depthIn),
      };
      setPlan((prev) => ({
        ...prev,
        items: [...prev.items, item],
        updatedAt: Date.now(),
      }));
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setPlan((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
      updatedAt: Date.now(),
    }));
  }, []);

  const moveItem = useCallback((id: string, x: number, y: number) => {
    setPlan((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, x, y } : it)),
      updatedAt: Date.now(),
    }));
  }, []);

  const rotateItem = useCallback((id: string, rotation: number) => {
    setPlan((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, rotation } : it)),
      updatedAt: Date.now(),
    }));
  }, []);

  const savePlan = useCallback(async () => {
    const toSave: RoomPlan = { ...plan, updatedAt: Date.now() };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [plan]);

  return { plan, isLoaded, setRoomWidth, setRoomDepth, addItem, removeItem, moveItem, rotateItem, savePlan };
}
