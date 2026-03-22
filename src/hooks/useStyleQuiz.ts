/**
 * @module useStyleQuiz
 *
 * Manages state for the onboarding style quiz. Collects answers matching
 * the Wix getQuizRecommendations() API contract (Permissions.Anyone):
 *   roomType, stylePreference, primaryUse, sizeNeeds, budgetRange
 *
 * Persists answers to AsyncStorage. getRecommendation() provides a local
 * fallback when the Wix API is unavailable.
 */
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@carolina_futons_style_preferences';

// Enum values match the Wix getQuizRecommendations() API contract exactly.
export type RoomType = 'living-room' | 'guest-room' | 'dorm' | 'office' | 'bedroom';
export type StylePreference = 'modern' | 'rustic' | 'classic';
export type PrimaryUse = 'sitting' | 'sleeping' | 'both';
export type SizeNeeds = 'twin' | 'full' | 'queen';
export type BudgetRange = 'under-500' | '500-1000' | '1000-2000' | 'over-2000';

export interface StylePreferences {
  roomType: RoomType | null;
  stylePreference: StylePreference | null;
  primaryUse: PrimaryUse | null;
  sizeNeeds: SizeNeeds | null;
  budgetRange: BudgetRange | null;
}

export interface QuizRecommendation {
  label: string;
  productSlugs: string[];
}

const EMPTY_PREFERENCES: StylePreferences = {
  roomType: null,
  stylePreference: null,
  primaryUse: null,
  sizeNeeds: null,
  budgetRange: null,
};

// ── Local recommendation matrix ───────────────────────────────────
// Fallback when Wix API is unavailable. Keyed on stylePreference×sizeNeeds
// so that size directly drives which product SKUs are surfaced.

type RecommendationKey = `${StylePreference}:${SizeNeeds}`;

const RECOMMENDATION_MAP: Record<RecommendationKey, QuizRecommendation> = {
  'modern:twin': { label: 'Coastal Studio', productSlugs: ['asheville-full-futon'] },
  'modern:full': {
    label: 'Coastal Minimalist',
    productSlugs: ['asheville-full-futon', 'blue-ridge-queen-futon'],
  },
  'modern:queen': { label: 'Coastal Suite', productSlugs: ['biltmore-loveseat'] },
  'rustic:twin': { label: 'Warm Retreat', productSlugs: ['asheville-full-futon'] },
  'rustic:full': {
    label: 'Warm Industrial',
    productSlugs: ['biltmore-loveseat', 'asheville-full-futon'],
  },
  'rustic:queen': { label: 'Mountain Lodge', productSlugs: ['biltmore-loveseat'] },
  'classic:twin': {
    label: 'Classic Retreat',
    productSlugs: ['asheville-full-futon', 'blue-ridge-queen-futon'],
  },
  'classic:full': {
    label: 'Classic Comfort',
    productSlugs: ['biltmore-loveseat', 'blue-ridge-queen-futon'],
  },
  'classic:queen': { label: 'Classic Grand', productSlugs: ['biltmore-loveseat'] },
};

const FALLBACK_RECOMMENDATION: QuizRecommendation = {
  label: 'Classic Comfort',
  productSlugs: ['asheville-full-futon', 'biltmore-loveseat', 'blue-ridge-queen-futon'],
};

/** Local fallback: maps stylePreference + sizeNeeds to a personality label and curated product slugs. */
export function getRecommendation(
  stylePreference: StylePreference | null | undefined,
  sizeNeeds: SizeNeeds | null | undefined,
): QuizRecommendation {
  if (!stylePreference || !sizeNeeds) return FALLBACK_RECOMMENDATION;
  const key: RecommendationKey = `${stylePreference}:${sizeNeeds}`;
  return RECOMMENDATION_MAP[key] ?? FALLBACK_RECOMMENDATION;
}

// ── Hook ─────────────────────────────────────────────────────────

/** Exposes quiz step setters and a save callback; state resets on unmount. */
export function useStyleQuiz() {
  const [preferences, setPreferences] = useState<StylePreferences>(EMPTY_PREFERENCES);

  const setRoomType = useCallback((roomType: RoomType) => {
    setPreferences((prev) => ({ ...prev, roomType }));
  }, []);

  const setStylePreference = useCallback((stylePreference: StylePreference) => {
    setPreferences((prev) => ({ ...prev, stylePreference }));
  }, []);

  const setPrimaryUse = useCallback((primaryUse: PrimaryUse) => {
    setPreferences((prev) => ({ ...prev, primaryUse }));
  }, []);

  const setSizeNeeds = useCallback((sizeNeeds: SizeNeeds) => {
    setPreferences((prev) => ({ ...prev, sizeNeeds }));
  }, []);

  const setBudgetRange = useCallback((budgetRange: BudgetRange) => {
    setPreferences((prev) => ({ ...prev, budgetRange }));
  }, []);

  const savePreferences = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  return {
    preferences,
    setRoomType,
    setStylePreference,
    setPrimaryUse,
    setSizeNeeds,
    setBudgetRange,
    savePreferences,
  };
}
