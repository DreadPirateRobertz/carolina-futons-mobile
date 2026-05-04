/**
 * @module TriggerMomentsContext
 *
 * hq-1e63: Exposes the useTriggerMoments result to descendant components so
 * GamificationPushBridge can call reportTierChanged, reportChallengesCompleted,
 * and reportTriggers without prop-drilling through App.tsx.
 *
 * Mirrors the BadgeToastContext pattern: App provides the context value from
 * its existing useTriggerMoments() call; bridge components consume it.
 */
import React, { createContext, useContext } from 'react';
import type { UseTriggerMomentsResult } from '@/hooks/useTriggerMoments';

const TriggerMomentsContext = createContext<UseTriggerMomentsResult | null>(null);

export function TriggerMomentsProvider({
  value,
  children,
}: {
  value: UseTriggerMomentsResult;
  children: React.ReactNode;
}) {
  return <TriggerMomentsContext.Provider value={value}>{children}</TriggerMomentsContext.Provider>;
}

export function useTriggerMomentsContext(): UseTriggerMomentsResult {
  const ctx = useContext(TriggerMomentsContext);
  if (!ctx) {
    throw new Error('useTriggerMomentsContext must be used within a TriggerMomentsProvider');
  }
  return ctx;
}
