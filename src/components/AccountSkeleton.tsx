/**
 * @module AccountSkeleton
 *
 * Loading skeleton for AccountScreen. Shown while auth is restoring the
 * session so the user does not briefly see the guest sign-in prompt
 * before the authenticated view appears.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { SkeletonRow, SkeletonCard } from './Skeleton';

export function AccountSkeleton({ testID }: { testID?: string }) {
  const { spacing } = useTheme();

  return (
    <View
      style={[styles.root, { backgroundColor: darkPalette.background }]}
      testID={testID ?? 'account-skeleton'}
      accessibilityLabel="Loading account"
      accessibilityRole="progressbar"
    >
      <View
        style={[styles.profileHeader, { paddingTop: spacing.xl, paddingHorizontal: spacing.lg }]}
      >
        <SkeletonRow
          width={60}
          height={60}
          borderRadius={30}
          testID="account-skeleton-avatar"
          style={{ marginBottom: 12 }}
        />
        <SkeletonRow width={160} height={22} style={{ marginBottom: 8 }} />
        <SkeletonRow width={220} height={14} style={{ marginBottom: 4 }} />
        <SkeletonRow width={120} height={14} />
      </View>

      <View style={[styles.menu, { paddingHorizontal: spacing.lg, gap: spacing.sm }]}>
        <SkeletonCard lines={1} testID="account-skeleton-menu-0" />
        <SkeletonCard lines={1} testID="account-skeleton-menu-1" />
        <SkeletonCard lines={1} testID="account-skeleton-menu-2" />
        <SkeletonCard lines={1} testID="account-skeleton-menu-3" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  menu: {
    marginTop: 8,
  },
});
