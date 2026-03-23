/**
 * useAvatarState — hq-xfib1 / Phase 6
 *
 * Fetches the current member's avatar state from the Wix backend webMethod
 * (/_functions/getAvatarState). Uses the member's Wix session access token
 * for SiteMember-permissioned auth.
 *
 * Falls back to guest defaults when unauthenticated (no error thrown).
 *
 * API contract (melania hq-wisp-q1m8):
 *   getAvatarState(memberToken) →
 *     { equippedAccessoryId, unlockedAccessoryIds, lottieAnimationId, bonusPointsDayActive }
 */

import { useState, useCallback, useEffect } from 'react';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';
import { getWixSdkClient } from '@/services/wix/wixSdkClient';

export interface UseAvatarStateResult {
  equippedAccessoryId: string | null;
  unlockedAccessoryIds: string[];
  lottieAnimationId: string | null;
  bonusPointsDayActive: boolean;
  loading: boolean;
  error: string | null;
  refreshAvatarState: () => Promise<void>;
}

const GUEST_DEFAULTS: Omit<UseAvatarStateResult, 'loading' | 'error' | 'refreshAvatarState'> = {
  equippedAccessoryId: null,
  unlockedAccessoryIds: [],
  lottieAnimationId: null,
  bonusPointsDayActive: false,
};

export function useAvatarState(): UseAvatarStateResult {
  const [equippedAccessoryId, setEquippedAccessoryId] = useState<string | null>(null);
  const [unlockedAccessoryIds, setUnlockedAccessoryIds] = useState<string[]>([]);
  const [lottieAnimationId, setLottieAnimationId] = useState<string | null>(null);
  const [bonusPointsDayActive, setBonusPointsDayActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let memberToken: string | undefined;
      try {
        const tokens = getWixSdkClient().auth.getTokens();
        memberToken = tokens.accessToken?.value;
      } catch {
        // SDK not initialized or user not authenticated — use guest defaults
      }

      if (!memberToken) {
        setEquippedAccessoryId(GUEST_DEFAULTS.equippedAccessoryId);
        setUnlockedAccessoryIds(GUEST_DEFAULTS.unlockedAccessoryIds);
        setLottieAnimationId(GUEST_DEFAULTS.lottieAnimationId);
        setBonusPointsDayActive(GUEST_DEFAULTS.bonusPointsDayActive);
        return;
      }

      const wixClient = getWixClientSingleton();
      if (!wixClient) {
        setError('Wix service unavailable');
        return;
      }

      const data = await wixClient.getAvatarState(memberToken);
      setEquippedAccessoryId(data.equippedAccessoryId ?? null);
      setUnlockedAccessoryIds(data.unlockedAccessoryIds ?? []);
      setLottieAnimationId(data.lottieAnimationId ?? null);
      setBonusPointsDayActive(data.bonusPointsDayActive ?? false);
    } catch (err) {
      setBonusPointsDayActive(false);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshAvatarState = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    equippedAccessoryId,
    unlockedAccessoryIds,
    lottieAnimationId,
    bonusPointsDayActive,
    loading,
    error,
    refreshAvatarState,
  };
}
