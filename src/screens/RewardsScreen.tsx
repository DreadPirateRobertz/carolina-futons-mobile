/**
 * @module RewardsScreen
 *
 * Displays the member's redeemable points and a Redeem button.
 * Fires emitRedemptionInitiated via the crossRigEventBus when the
 * user initiates a redemption.
 *
 * cf-87tn / Phase 8
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme';
import { useLoyalty } from '@/hooks/useLoyalty';
import { emitRedemptionInitiated } from '@/services/crossRigEventBus';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';
import { captureException } from '@/services/crashReporting';

interface Props {
  testID?: string;
}

export function RewardsScreen({ testID }: Props) {
  const { colors, spacing, typography } = useTheme();
  const { points, loading, error, refreshPoints } = useLoyalty();

  if (loading) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'rewards-screen'}
      >
        <ActivityIndicator size="large" color={colors.sunsetCoral} testID="rewards-loading" />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'rewards-screen'}
      >
        <Text
          style={[
            styles.errorText,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
          testID="rewards-error"
        >
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.sunsetCoral }]}
          onPress={refreshPoints}
          testID="rewards-retry"
          accessibilityRole="button"
        >
          <Text style={[styles.retryText, { fontFamily: typography.bodyFamilyBold }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function handleRedeem() {
    if (points <= 0) return;
    try {
      const client = getWixClientSingleton();
      emitRedemptionInitiated(client, {
        pointsRedeemed: points,
        newTotal: Math.max(0, points - points),
      }).catch((err: unknown) =>
        captureException(err instanceof Error ? err : new Error(String(err))),
      );
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)));
    }
  }

  return (
    <View
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'rewards-screen'}
    >
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <Text
          style={[styles.points, { color: colors.espresso, fontFamily: typography.headingFamily }]}
          testID="rewards-points"
        >
          {points}
        </Text>
        <Text
          style={[
            styles.pointsLabel,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
        >
          points available
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.redeemButton,
          { backgroundColor: points > 0 ? colors.sunsetCoral : colors.sandDark },
        ]}
        onPress={handleRedeem}
        testID="rewards-redeem-button"
        accessibilityRole="button"
        disabled={points <= 0}
      >
        <Text style={[styles.redeemText, { fontFamily: typography.bodyFamilyBold }]}>
          Redeem Points
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 40, paddingBottom: 24, alignItems: 'center' },
  points: { fontSize: 64, fontWeight: '700', lineHeight: 72 },
  pointsLabel: { fontSize: 16, marginBottom: 16 },
  redeemButton: {
    marginHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  redeemText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  errorText: { fontSize: 15, textAlign: 'center', marginHorizontal: 32, marginBottom: 20 },
  retryButton: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
