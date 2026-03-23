/**
 * @module BadgeToastContext
 *
 * React context + provider that makes showBadgeToast available anywhere in the
 * app tree. BadgeToastProvider renders the BadgeToast overlay globally so it
 * displays above all navigation layers.
 *
 * Usage (Phase 5 integration point):
 *   const { showBadgeToast } = useBadgeToastContext();
 *   // Inside useTriggerMoments, when triggers.badgeUnlocked is non-null:
 *   showBadgeToast(triggers.badgeUnlocked);
 *
 * hq-v0a2z
 */
import React, { createContext, useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import { BadgeToast } from '@/components/BadgeToast';
import { useBadgeToast } from '@/hooks/useBadgeToast';

interface BadgeToastContextValue {
  showBadgeToast: (badgeName: string) => void;
}

const BadgeToastContext = createContext<BadgeToastContextValue | null>(null);

/** Provides showBadgeToast and renders the global BadgeToast overlay. */
export function BadgeToastProvider({ children }: { children: React.ReactNode }) {
  const { visible, badgeName, showBadgeToast } = useBadgeToast();

  return (
    <BadgeToastContext.Provider value={{ showBadgeToast }}>
      <View style={styles.container}>
        {children}
        <BadgeToast
          badgeName={badgeName ?? ''}
          visible={visible}
          testID="badge-toast"
        />
      </View>
    </BadgeToastContext.Provider>
  );
}

/**
 * Hook to trigger a badge unlock toast from any component.
 * Must be used within BadgeToastProvider.
 */
export function useBadgeToastContext(): BadgeToastContextValue {
  const ctx = useContext(BadgeToastContext);
  if (!ctx) {
    throw new Error('useBadgeToastContext must be used within a BadgeToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
