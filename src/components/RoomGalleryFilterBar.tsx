/**
 * @module RoomGalleryFilterBar
 *
 * Horizontal filter pill bar for the Room Gallery screen.
 *
 * Row 1 — Style pills: All | Modern | Coastal | Rustic | Traditional
 * Row 2 — Product pills (one per unique product in the current room list)
 * Row 3 — "Clear filters" button (only when hasActiveFilters is true)
 *
 * hq-322: Room gallery filters by style tag and by product.
 */

import React, { memo, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme';
import type { RoomGalleryStyle } from '@/hooks/useRoomGalleryFilters';
import type { RoomGalleryFilters } from '@/hooks/useRoomGalleryFilters';

export interface ProductOption {
  id: string;
  name: string;
}

export interface RoomGalleryFilterBarProps {
  filters: RoomGalleryFilters;
  setStyleFilter: (style: RoomGalleryStyle | null) => void;
  setProductFilter: (productId: string | null) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  productOptions: ProductOption[];
}

const STYLE_OPTIONS: { label: string; value: RoomGalleryStyle | null }[] = [
  { label: 'All', value: null },
  { label: 'Modern', value: 'Modern' },
  { label: 'Coastal', value: 'Coastal' },
  { label: 'Rustic', value: 'Rustic' },
  { label: 'Traditional', value: 'Traditional' },
];

function StylePill({
  label,
  value,
  activeStyle,
  onPress,
}: {
  label: string;
  value: RoomGalleryStyle | null;
  activeStyle: RoomGalleryStyle | null;
  onPress: (value: RoomGalleryStyle | null) => void;
}) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const isSelected = value === activeStyle;
  const handlePress = useCallback(() => onPress(value), [onPress, value]);

  return (
    <TouchableOpacity
      testID={`style-pill-${label}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`Filter by ${label} style`}
      onPress={handlePress}
      style={[
        styles.pill,
        {
          backgroundColor: isSelected ? colors.espresso : colors.sandLight,
          borderRadius: borderRadius.pill,
          marginRight: spacing.xs,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
        },
      ]}
    >
      <Text
        style={[
          styles.pillText,
          {
            color: isSelected ? colors.white : colors.espresso,
            fontFamily: isSelected ? typography.bodyFamilyBold : typography.bodyFamily,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ProductPill({
  option,
  activeProductId,
  onPress,
}: {
  option: ProductOption;
  activeProductId: string | null;
  onPress: (productId: string | null) => void;
}) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const isSelected = option.id === activeProductId;
  // Tap active pill → deselect (set null); tap inactive → select
  const handlePress = useCallback(
    () => onPress(isSelected ? null : option.id),
    [onPress, isSelected, option.id],
  );

  return (
    <TouchableOpacity
      testID={`product-pill-${option.id}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`Filter by product ${option.name}`}
      onPress={handlePress}
      style={[
        styles.pill,
        {
          backgroundColor: isSelected ? colors.mountainBlue : colors.sandLight,
          borderRadius: borderRadius.pill,
          marginRight: spacing.xs,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
        },
      ]}
    >
      <Text
        style={[
          styles.pillText,
          {
            color: isSelected ? colors.white : colors.espresso,
            fontFamily: isSelected ? typography.bodyFamilyBold : typography.bodyFamily,
          },
        ]}
      >
        {option.name}
      </Text>
    </TouchableOpacity>
  );
}

const MemoStylePill = memo(StylePill);
const MemoProductPill = memo(ProductPill);

/** Filter pill bar with style and product rows. */
export function RoomGalleryFilterBar({
  filters,
  setStyleFilter,
  setProductFilter,
  clearFilters,
  hasActiveFilters,
  productOptions,
}: RoomGalleryFilterBarProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View testID="room-gallery-filter-bar" style={styles.root}>
      {/* Style pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { paddingHorizontal: spacing.md }]}
      >
        {STYLE_OPTIONS.map(({ label, value }) => (
          <MemoStylePill
            key={label}
            label={label}
            value={value}
            activeStyle={filters.style}
            onPress={setStyleFilter}
          />
        ))}
      </ScrollView>

      {/* Product pills */}
      {productOptions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.row, { paddingHorizontal: spacing.md }]}
        >
          {productOptions.map((option) => (
            <MemoProductPill
              key={option.id}
              option={option}
              activeProductId={filters.productId}
              onPress={setProductFilter}
            />
          ))}
        </ScrollView>
      )}

      {/* Clear filters */}
      {hasActiveFilters && (
        <TouchableOpacity
          testID="filter-bar-clear"
          accessibilityRole="button"
          accessibilityLabel="Clear all filters"
          onPress={clearFilters}
          style={[styles.clearButton, { paddingHorizontal: spacing.md }]}
        >
          <Text
            style={[
              styles.clearText,
              { color: colors.espressoLight, fontFamily: typography.bodyFamily },
            ]}
          >
            Clear filters
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: 8,
  },
  row: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  pill: {
    minWidth: 60,
    alignItems: 'center',
  },
  pillText: {
    fontSize: 13,
  },
  clearButton: {
    paddingVertical: 4,
  },
  clearText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
