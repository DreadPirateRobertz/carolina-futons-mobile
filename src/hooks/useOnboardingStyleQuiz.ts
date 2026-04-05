/**
 * @module useOnboardingStyleQuiz
 *
 * Hook for the onboarding style preference modal — cm-qdm.
 *
 * Collects two answers:
 *   1. furnitureStyle: Modern | Coastal | Rustic | Traditional
 *   2. roomType: living-room | bedroom | guest-room | dorm | office
 *
 * On save:
 *   - Persists to AsyncStorage (always)
 *   - Upserts to MemberStylePreferences Wix CMS collection (when wixClient + memberId provided)
 *   - CMS failure is non-fatal: local save still succeeds
 */

import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureException } from '@/services/crashReporting';

// ── Constants ─────────────────────────────────────────────────────────────────

export const ONBOARDING_STYLE_STORAGE_KEY = '@carolina_futons_onboarding_style';
const CMS_COLLECTION = 'MemberStylePreferences';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FurnitureStyle = 'modern' | 'coastal' | 'rustic' | 'traditional';
export type OnboardingRoomType = 'living-room' | 'bedroom' | 'guest-room' | 'dorm' | 'office';

interface WixClientLike {
  upsertDataItem: (
    collectionId: string,
    filter: Record<string, unknown>,
    data: Record<string, unknown>,
  ) => Promise<unknown>;
}

export interface UseOnboardingStyleQuizOptions {
  wixClient?: WixClientLike | null;
  memberId?: string;
  getNow?: () => Date;
}

export interface UseOnboardingStyleQuizReturn {
  furnitureStyle: FurnitureStyle | null;
  roomType: OnboardingRoomType | null;
  /** 0 = furniture style, 1 = room type, 2 = completion */
  step: number;
  isSaving: boolean;
  saveError: string | null;
  setFurnitureStyle: (style: FurnitureStyle) => void;
  setRoomType: (room: OnboardingRoomType) => void;
  goBack: () => void;
  save: () => Promise<boolean>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOnboardingStyleQuiz(
  options: UseOnboardingStyleQuizOptions = {},
): UseOnboardingStyleQuizReturn {
  const { wixClient = null, memberId, getNow = () => new Date() } = options;

  const [furnitureStyle, setFurnitureStyleState] = useState<FurnitureStyle | null>(null);
  const [roomType, setRoomTypeState] = useState<OnboardingRoomType | null>(null);
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const setFurnitureStyle = useCallback((style: FurnitureStyle) => {
    setFurnitureStyleState(style);
    setStep((s) => Math.max(s, 1));
  }, []);

  const setRoomType = useCallback((room: OnboardingRoomType) => {
    setRoomTypeState(room);
    setStep((s) => Math.max(s, 2));
  }, []);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (!furnitureStyle || !roomType) return false;

    setIsSaving(true);
    setSaveError(null);

    const now = getNow().toISOString();

    // AsyncStorage — must succeed for overall success
    try {
      await AsyncStorage.setItem(
        ONBOARDING_STYLE_STORAGE_KEY,
        JSON.stringify({ furnitureStyle, roomType, savedAt: now }),
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      captureException(error);
      setSaveError(error.message);
      setIsSaving(false);
      return false;
    }

    // CMS upsert — non-fatal
    if (wixClient && memberId) {
      try {
        await wixClient.upsertDataItem(
          CMS_COLLECTION,
          { memberId: { $eq: memberId } },
          { memberId, furnitureStyle, roomType, updatedAt: now },
        );
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        captureException(error);
        setSaveError(error.message);
        // Non-fatal — fall through, return true
      }
    }

    setIsSaving(false);
    return true;
  }, [furnitureStyle, roomType, wixClient, memberId, getNow]);

  return {
    furnitureStyle,
    roomType,
    step,
    isSaving,
    saveError,
    setFurnitureStyle,
    setRoomType,
    goBack,
    save,
  };
}
