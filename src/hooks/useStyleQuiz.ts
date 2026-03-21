/**
 * @module useStyleQuiz
 *
 * Manages state for the onboarding style quiz that collects room type,
 * aesthetic preference, primary use-case, color palette, and size preference.
 * Persists answers to AsyncStorage and provides getRecommendation() to map
 * preferences to a personality label and curated product slugs.
 */
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@carolina_futons_style_preferences';

export type RoomType = 'living-room' | 'bedroom' | 'studio' | 'guest-room';
export type StylePreference = 'modern' | 'rustic' | 'classic' | 'minimalist';
export type PrimaryUse = 'seating' | 'guest-bed' | 'dual-purpose' | 'kid-friendly';
export type ColorPalette = 'warm' | 'cool' | 'neutral' | 'bold';
export type SizePreference = 'apartment' | 'standard' | 'oversized' | 'custom';

export interface StylePreferences {
  room: RoomType | null;
  style: StylePreference | null;
  primaryUse: PrimaryUse | null;
  colorPalette: ColorPalette | null;
  sizePreference: SizePreference | null;
}

export interface QuizRecommendation {
  label: string;
  productSlugs: string[];
}

const EMPTY_PREFERENCES: StylePreferences = {
  room: null,
  style: null,
  primaryUse: null,
  colorPalette: null,
  sizePreference: null,
};

// ── Recommendation matrix ────────────────────────────────────────

type RecommendationKey = `${StylePreference}:${ColorPalette}`;

const RECOMMENDATION_MAP: Record<RecommendationKey, QuizRecommendation> = {
  'modern:cool': {
    label: 'Coastal Minimalist',
    productSlugs: ['asheville-full', 'blue-ridge-full'],
  },
  'modern:warm': { label: 'Urban Warmth', productSlugs: ['asheville-full', 'biltmore-queen'] },
  'modern:neutral': {
    label: 'Nordic Minimalist',
    productSlugs: ['asheville-full', 'blue-ridge-full'],
  },
  'modern:bold': { label: 'Contemporary Bold', productSlugs: ['biltmore-queen', 'asheville-full'] },
  'rustic:warm': { label: 'Warm Industrial', productSlugs: ['biltmore-queen', 'asheville-full'] },
  'rustic:cool': { label: 'Mountain Modern', productSlugs: ['blue-ridge-full', 'asheville-full'] },
  'rustic:neutral': {
    label: 'Rustic Natural',
    productSlugs: ['biltmore-queen', 'blue-ridge-full'],
  },
  'rustic:bold': { label: 'Bold Craftsman', productSlugs: ['biltmore-queen', 'asheville-full'] },
  'classic:warm': { label: 'Cabin Cozy', productSlugs: ['biltmore-queen', 'blue-ridge-full'] },
  'classic:cool': { label: 'Timeless Cool', productSlugs: ['blue-ridge-full', 'asheville-full'] },
  'classic:neutral': {
    label: 'Classic Comfort',
    productSlugs: ['biltmore-queen', 'blue-ridge-full'],
  },
  'classic:bold': { label: 'Rich Traditional', productSlugs: ['biltmore-queen', 'asheville-full'] },
  'minimalist:cool': {
    label: 'Nordic Minimalist',
    productSlugs: ['asheville-full', 'blue-ridge-full'],
  },
  'minimalist:warm': { label: 'Warm Minimal', productSlugs: ['asheville-full', 'biltmore-queen'] },
  'minimalist:neutral': {
    label: 'Zen Neutral',
    productSlugs: ['asheville-full', 'blue-ridge-full'],
  },
  'minimalist:bold': {
    label: 'Graphic Minimalist',
    productSlugs: ['asheville-full', 'biltmore-queen'],
  },
};

const FALLBACK_RECOMMENDATION: QuizRecommendation = {
  label: 'Classic Comfort',
  productSlugs: ['asheville-full', 'biltmore-queen', 'blue-ridge-full'],
};

/** Maps style + colorPalette preferences to a personality label and curated product slugs. */
export function getRecommendation(
  style: StylePreference | null | undefined,
  colorPalette: ColorPalette | null | undefined,
): QuizRecommendation {
  if (!style || !colorPalette) return FALLBACK_RECOMMENDATION;
  const key: RecommendationKey = `${style}:${colorPalette}`;
  return RECOMMENDATION_MAP[key] ?? FALLBACK_RECOMMENDATION;
}

// ── Hook ─────────────────────────────────────────────────────────

/** Exposes quiz step setters and a save callback; state resets on unmount. */
export function useStyleQuiz() {
  const [preferences, setPreferences] = useState<StylePreferences>(EMPTY_PREFERENCES);

  const setRoom = useCallback((room: RoomType) => {
    setPreferences((prev) => ({ ...prev, room }));
  }, []);

  const setStyle = useCallback((style: StylePreference) => {
    setPreferences((prev) => ({ ...prev, style }));
  }, []);

  const setPrimaryUse = useCallback((primaryUse: PrimaryUse) => {
    setPreferences((prev) => ({ ...prev, primaryUse }));
  }, []);

  const setColorPalette = useCallback((colorPalette: ColorPalette) => {
    setPreferences((prev) => ({ ...prev, colorPalette }));
  }, []);

  const setSizePreference = useCallback((sizePreference: SizePreference) => {
    setPreferences((prev) => ({ ...prev, sizePreference }));
  }, []);

  const savePreferences = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Storage write failed — preferences lost but onboarding continues
    }
  }, [preferences]);

  return {
    preferences,
    setRoom,
    setStyle,
    setPrimaryUse,
    setColorPalette,
    setSizePreference,
    savePreferences,
  };
}
