/**
 * @module ProductBadge
 *
 * Unified product badge component — shared visual language with cfutons web.
 * (cm-snj: Gamification expansion — badge visual language alignment)
 *
 * Supported types (aligned with melania's ProductBadges CMS collection):
 *   NEW             — mountainBlue   — "New"
 *   BESTSELLER      — sunsetCoral    — "Bestseller"
 *   LOW_STOCK       — amber          — "Low Stock"
 *   SALE            — sunsetCoral    — "Sale"
 *   CF_PLUS_EXCLUSIVE — espresso     — "CF+"
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import type { ProductBadgeType } from '@/data/productBadgeTypes';
export { normalizeBadgeType } from '@/data/productBadgeTypes';

interface BadgeConfig {
  label: string;
  accessibilityLabel: string;
  bgColor: (colors: ReturnType<typeof useTheme>['colors']) => string;
  textColor: (colors: ReturnType<typeof useTheme>['colors']) => string;
}

const BADGE_CONFIG: Record<ProductBadgeType, BadgeConfig> = {
  NEW: {
    label: 'New',
    accessibilityLabel: 'New product',
    bgColor: (c) => c.mountainBlue,
    textColor: (c) => c.white,
  },
  BESTSELLER: {
    label: 'Bestseller',
    accessibilityLabel: 'Bestseller',
    bgColor: (c) => c.sunsetCoral,
    textColor: (c) => c.white,
  },
  LOW_STOCK: {
    label: 'Low Stock',
    accessibilityLabel: 'Low stock',
    bgColor: (_c) => '#D4920B',
    textColor: (_c) => '#FFFFFF',
  },
  SALE: {
    label: 'Sale',
    accessibilityLabel: 'On sale',
    bgColor: (c) => c.sunsetCoral,
    textColor: (c) => c.white,
  },
  CF_PLUS_EXCLUSIVE: {
    label: 'CF+',
    accessibilityLabel: 'CF+ exclusive item',
    bgColor: (c) => c.espresso,
    textColor: (c) => c.sandBase,
  },
};

interface Props {
  type: ProductBadgeType | null | undefined;
  /** Smaller layout for product grid cards */
  compact?: boolean;
  testID?: string;
}

export function ProductBadge({ type, compact = false, testID = 'product-badge' }: Props) {
  const { colors, borderRadius } = useTheme();

  if (!type) return null;

  const config = BADGE_CONFIG[type];
  if (!config) return null;

  return (
    <View
      style={[
        styles.badge,
        compact && styles.compact,
        {
          backgroundColor: config.bgColor(colors),
          borderRadius: borderRadius.sm,
        },
      ]}
      testID={testID}
      accessibilityLabel={config.accessibilityLabel}
    >
      <Text
        style={[styles.text, compact && styles.compactText, { color: config.textColor(colors) }]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  compact: {
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  compactText: {
    fontSize: 10,
  },
});
