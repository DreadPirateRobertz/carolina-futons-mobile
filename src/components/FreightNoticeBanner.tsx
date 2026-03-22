/**
 * @module FreightNoticeBanner
 *
 * Display-only freight delivery notice for the Product Detail Screen.
 * Shows when a product requires freight (LTL) delivery — carrier will call
 * the customer to schedule. Optionally shows a liftgate badge when the
 * product requires liftgate service.
 *
 * No booking logic — presentation only.
 */

import React, { memo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  requiresFreight?: boolean | null;
  requiresLiftgate?: boolean | null;
  testID?: string;
}

export const FreightNoticeBanner = memo(function FreightNoticeBanner({
  requiresFreight,
  requiresLiftgate,
  testID = 'freight-notice-banner',
}: Props) {
  const { colors } = useTheme();

  if (!requiresFreight) return null;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.sandLight, borderLeftColor: colors.sunsetCoralDark }]}
      testID={testID}
      accessibilityRole="text"
    >
      <View style={styles.row}>
        <Text style={styles.icon}>🚛</Text>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: colors.errorText }]}>Freight Delivery</Text>
          <Text style={[styles.subtitle, { color: colors.mutedBrown }]}>Carrier will call to schedule</Text>
        </View>
        {requiresLiftgate && (
          <View
            style={[styles.liftgateBadge, { backgroundColor: colors.sunsetCoralDark }]}
            testID="liftgate-badge"
            accessibilityLabel="Liftgate required for delivery"
          >
            <Text style={[styles.liftgateText, { color: colors.offWhite }]}>Liftgate Required</Text>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 18,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  liftgateBadge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  liftgateText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
