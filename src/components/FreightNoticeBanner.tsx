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
  if (!requiresFreight) return null;

  return (
    <View style={styles.container} testID={testID} accessibilityRole="text">
      <View style={styles.row}>
        <Text style={styles.icon}>🚛</Text>
        <View style={styles.textBlock}>
          <Text style={styles.title}>Freight Delivery</Text>
          <Text style={styles.subtitle}>Carrier will call to schedule</Text>
        </View>
        {requiresLiftgate && (
          <View
            style={styles.liftgateBadge}
            testID="liftgate-badge"
            accessibilityLabel="Liftgate required for delivery"
          >
            <Text style={styles.liftgateText}>Liftgate Required</Text>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 3,
    borderLeftColor: '#E65100',
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
    color: '#BF360C',
  },
  subtitle: {
    fontSize: 12,
    color: '#6D4C41',
    marginTop: 1,
  },
  liftgateBadge: {
    backgroundColor: '#E65100',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  liftgateText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
