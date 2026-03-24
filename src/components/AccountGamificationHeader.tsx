/**
 * @module AccountGamificationHeader
 *
 * Consolidated gamification summary widget for AccountScreen header.
 * Shows tier badge + points balance, active streak + multiplier, and
 * next-tier progress bar in a single glanceable row.
 *
 * Self-contained: owns its own useLoyalty + useStreak data fetching.
 * Tap navigates to the Loyalty screen via the optional onPress callback.
 *
 * hq-u6i9c
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LoyaltyTierBadge } from '@/components/LoyaltyTierBadge';
import { StreakBadge } from '@/components/StreakBadge';
import { TierProgressBar } from '@/components/TierProgressBar';
import { useLoyalty } from '@/hooks/useLoyalty';
import { useStreak } from '@/hooks/useStreak';
import { getStreakMultiplier } from '@/utils/streakMultiplier';

export interface AccountGamificationHeaderProps {
  /** Called when the user taps the widget — typically nav.navigate('Loyalty'). */
  onPress?: () => void;
  testID?: string;
}

export function AccountGamificationHeader({
  onPress,
  testID,
}: AccountGamificationHeaderProps) {
  const { points, tier, loading } = useLoyalty();
  const { streak, loading: streakLoading } = useStreak();

  const multiplier = getStreakMultiplier(streak);
  const a11yLabel = loading
    ? 'Loading gamification status'
    : `${tier} tier, ${points.toLocaleString()} points, ${streak} day streak${multiplier > 1 ? `, ${multiplier}× points` : ''}`;

  if (loading) {
    return (
      <View
        testID={testID ?? 'account-gamification-header'}
        style={styles.loadingContainer}
        accessibilityLabel="Loading gamification status"
      >
        <View testID="gam-header-loading" style={styles.loadingInner}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      testID={testID ?? 'account-gamification-header'}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      accessibilityLabel={a11yLabel}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityHint={onPress ? 'Opens loyalty rewards details' : undefined}
      style={styles.container}
    >
      <LoyaltyTierBadge points={points} />
      {!streakLoading ? (
        <StreakBadge streak={streak} showBaseMultiplier testID="streak-badge" />
      ) : null}
      <TierProgressBar points={points} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  loadingContainer: {
    minHeight: 72,
    justifyContent: 'center',
  },
  loadingInner: {
    alignItems: 'center',
  },
});
