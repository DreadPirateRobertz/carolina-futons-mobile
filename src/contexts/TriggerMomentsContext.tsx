/**
 * @module TriggerMomentsContext
 *
 * React context + provider that hosts useTriggerMoments at the App root
 * and renders ChallengeCompletedToast as a global floating overlay.
 *
 * Mount TriggerMomentsProvider inside AppNavigator so the toast floats
 * above all navigation layers. Consumers call useTriggerMomentsContext()
 * to read triggers, dismiss, and reportChallengesCompleted.
 *
 * hq-qrjk2
 */
import React, { createContext, useContext, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { ChallengeCompletedToast } from '@/components/ChallengeCompletedToast';
import {
  useTriggerMoments,
  type TriggerMoments,
  type UseTriggerMomentsResult,
} from '@/hooks/useTriggerMoments';

/** Duration of the full toast animation sequence (fade-in + hold + fade-out). */
const TOAST_ANIMATION_DURATION_MS = 1900;

interface TriggerMomentsContextValue {
  triggers: TriggerMoments;
  dismiss: UseTriggerMomentsResult['dismiss'];
  reportChallengesCompleted: UseTriggerMomentsResult['reportChallengesCompleted'];
}

const TriggerMomentsContext = createContext<TriggerMomentsContextValue | null>(null);

/** Hosts useTriggerMoments once at the App root and renders the global ChallengeCompletedToast overlay. */
export function TriggerMomentsProvider({ children }: { children: React.ReactNode }) {
  const { triggers, dismiss, reportChallengesCompleted } = useTriggerMoments();

  // Auto-dismiss after the toast animation completes so the next queue item can show.
  // Keyed on challengeId so the timer re-arms for each new queue item rather than on
  // every reference change of the challengeCompleted object.
  useEffect(() => {
    if (!triggers.challengeCompleted) return;
    const timer = setTimeout(() => {
      dismiss('challengeCompleted');
    }, TOAST_ANIMATION_DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggers.challengeCompleted?.challengeId, dismiss]);

  return (
    <TriggerMomentsContext.Provider value={{ triggers, dismiss, reportChallengesCompleted }}>
      <View style={styles.container}>
        {children}
        <ChallengeCompletedToast
          key={triggers.challengeCompleted?.challengeId ?? 'none'}
          title={triggers.challengeCompleted?.title ?? ''}
          rewardPoints={triggers.challengeCompleted?.rewardPoints ?? 0}
          visible={triggers.challengeCompleted !== null}
          testID="challenge-completed-toast"
        />
      </View>
    </TriggerMomentsContext.Provider>
  );
}

/**
 * Returns triggers, dismiss, and reportChallengesCompleted from the nearest
 * TriggerMomentsProvider. Throws if used outside one.
 */
export function useTriggerMomentsContext(): TriggerMomentsContextValue {
  const ctx = useContext(TriggerMomentsContext);
  if (!ctx) {
    throw new Error('useTriggerMomentsContext must be used within a TriggerMomentsProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
