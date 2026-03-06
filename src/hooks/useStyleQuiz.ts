/**
 * @module useStyleQuiz
 *
 * Manages state for the onboarding style quiz that collects room type,
 * aesthetic preference, and primary use-case. Persists answers to
 * AsyncStorage so the recommendation engine can personalize results
 * on subsequent launches.
 */
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@carolina_futons_style_preferences';

export type RoomType = 'living-room' | 'bedroom' | 'studio' | 'guest-room';
export type StylePreference = 'modern' | 'rustic' | 'classic' | 'minimalist';
export type PrimaryUse = 'seating' | 'guest-bed' | 'dual-purpose' | 'kid-friendly';

export interface StylePreferences {
  room: RoomType | null;
  style: StylePreference | null;
  primaryUse: PrimaryUse | null;
}

const EMPTY_PREFERENCES: StylePreferences = {
  room: null,
  style: null,
  primaryUse: null,
};

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
    savePreferences,
  };
}
