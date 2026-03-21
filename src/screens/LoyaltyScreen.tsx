/**
 * @module LoyaltyScreen
 *
 * Displays the current member's loyalty points balance, tier badge, and
 * transaction history. Handles loading, error, and empty-transaction states.
 *
 * Points are session-scoped (memberId from WixAuthService.getCurrentMember()).
 * No user-supplied memberId — no IDOR risk.
 */

import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/theme';
import { useLoyalty, type LoyaltyTransaction } from '@/hooks/useLoyalty';
import { LoyaltyBadge } from '@/components/LoyaltyBadge';

interface Props {
  testID?: string;
  onClose?: () => void;
}

const TIER_NEXT: Record<string, { label: string; threshold: number } | null> = {
  bronze: { label: 'Silver', threshold: 1000 },
  silver: { label: 'Gold', threshold: 5000 },
  gold: null,
};

export function LoyaltyScreen({ testID, onClose: _onClose }: Props) {
  const { colors, spacing, typography } = useTheme();
  const { points, tier, totalEarned, transactions, loading, error, refreshPoints } = useLoyalty();

  const renderTransaction = useCallback(
    ({ item }: { item: LoyaltyTransaction }) => (
      <View
        style={[styles.txRow, { borderBottomColor: colors.sandDark }]}
        testID={`tx-row-${item._id}`}
      >
        <Text
          style={[styles.txReason, { color: colors.espresso, fontFamily: typography.bodyFamily }]}
          numberOfLines={1}
        >
          {item.reason}
        </Text>
        <Text
          style={[
            styles.txDelta,
            { color: item.delta >= 0 ? colors.mountainBlue : colors.sunsetCoral },
          ]}
        >
          {item.delta >= 0 ? '+' : ''}
          {item.delta}
        </Text>
      </View>
    ),
    [colors, typography],
  );

  const keyExtractor = useCallback((item: LoyaltyTransaction) => item._id, []);

  if (loading) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'loyalty-screen'}
      >
        <ActivityIndicator size="large" color={colors.sunsetCoral} testID="loyalty-loading" />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'loyalty-screen'}
      >
        <Text
          style={[
            styles.errorText,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
          testID="loyalty-error"
        >
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.sunsetCoral }]}
          onPress={refreshPoints}
          testID="loyalty-retry"
          accessibilityRole="button"
        >
          <Text style={[styles.retryText, { fontFamily: typography.bodyFamilyBold }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nextTier = TIER_NEXT[tier];
  const progressPct = nextTier
    ? Math.min(100, Math.round((points / nextTier.threshold) * 100))
    : 100;

  return (
    <View
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'loyalty-screen'}
    >
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <Text
          style={[styles.points, { color: colors.espresso, fontFamily: typography.headingFamily }]}
          testID="loyalty-points"
        >
          {points}
        </Text>
        <Text
          style={[
            styles.pointsLabel,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
        >
          points
        </Text>
        <LoyaltyBadge tier={tier} testID="loyalty-tier-badge" />
        {nextTier && (
          <View style={styles.progressWrap} testID="loyalty-progress">
            <View style={[styles.progressTrack, { backgroundColor: colors.sandDark }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.mountainBlue,
                    width: `${progressPct}%` as `${number}%`,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.progressLabel,
                { color: colors.espressoLight, fontFamily: typography.bodyFamily },
              ]}
            >
              {points} / {nextTier.threshold} to {nextTier.label}
            </Text>
          </View>
        )}
        <Text
          style={[
            styles.totalEarned,
            { color: colors.espressoLight, fontFamily: typography.bodyFamily },
          ]}
          testID="loyalty-total-earned"
        >
          {totalEarned} pts total earned
        </Text>
      </View>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: colors.espressoLight,
            fontFamily: typography.bodyFamilyBold,
            paddingHorizontal: spacing.lg,
          },
        ]}
      >
        Activity
      </Text>
      {transactions.length === 0 ? (
        <View style={styles.emptyTx}>
          <Text
            style={[
              styles.emptyText,
              { color: colors.espressoLight, fontFamily: typography.bodyFamily },
            ]}
            testID="loyalty-no-transactions"
          >
            No transactions yet. Earn points by shopping!
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          testID="loyalty-tx-list"
          showsVerticalScrollIndicator={false}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 40, paddingBottom: 20, alignItems: 'center' },
  points: { fontSize: 64, fontWeight: '700', lineHeight: 72 },
  pointsLabel: { fontSize: 16, marginBottom: 16 },
  progressWrap: { width: '100%', marginTop: 16 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabel: { fontSize: 12, marginTop: 6, textAlign: 'center' },
  totalEarned: { fontSize: 13, marginTop: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  txReason: { fontSize: 14, flex: 1, marginRight: 12 },
  txDelta: { fontSize: 16, fontWeight: '700' },
  errorText: { fontSize: 15, textAlign: 'center', marginHorizontal: 32, marginBottom: 20 },
  retryButton: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  emptyTx: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
