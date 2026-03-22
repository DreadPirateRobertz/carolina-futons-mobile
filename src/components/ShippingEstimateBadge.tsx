/**
 * @module ShippingEstimateBadge
 *
 * Compact one-line shipping estimate badge for the Product Detail Screen.
 * Shows `{icon} Ships in {label}` with an optional gamification badge pill.
 * Renders nothing when loading or when no label is available.
 */

import React, { memo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '@/theme';

const BADGE_STYLE_COLORS: Record<string, string> = {
  local: '#2E7D32',
  savings: '#1565C0',
  premium: '#6A1B9A',
  freight: '#E65100',
};

interface Props {
  icon: string;
  label: string | null;
  badge: string | null;
  badgeStyle: string | null;
  isLoading: boolean;
  testID?: string;
}

export const ShippingEstimateBadge = memo(function ShippingEstimateBadge({
  icon,
  label,
  badge,
  badgeStyle,
  isLoading,
  testID = 'shipping-estimate-badge',
}: Props) {
  if (isLoading || !label) return null;

  const pillColor = (badgeStyle && BADGE_STYLE_COLORS[badgeStyle]) ?? '#555555';

  return (
    <View style={styles.row} testID={testID}>
      <Text style={styles.icon}>{icon}</Text>
      <EstimateLabel label={label} />
      {badge ? (
        <View style={[styles.pill, { backgroundColor: pillColor }]} testID="shipping-badge-pill">
          <Text style={styles.pillText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
});

function EstimateLabel({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.label, { color: colors.espresso }]}>
      {'Ships in '}
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  icon: {
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
