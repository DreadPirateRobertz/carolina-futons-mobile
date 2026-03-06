/**
 * @module CategoryFilter
 *
 * Horizontal scrollable chip bar for filtering products by category.
 * Includes an "All" chip that clears the filter. Chips highlight
 * the currently selected category with the espresso background color.
 */

import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/theme';
import { type ProductCategory, type CategoryInfo } from '@/data/products';

interface Props {
  categories: CategoryInfo[];
  selected: ProductCategory | null;
  onSelect: (category: ProductCategory | null) => void;
  testID?: string;
}

/**
 * Renders a horizontal row of filter chips for product categories.
 *
 * @param props.categories - Available categories with labels and counts
 * @param props.selected - Currently active category, or null for "All"
 * @param props.onSelect - Callback when a chip is tapped; null clears the filter
 * @param props.testID - Test identifier
 * @returns A horizontal ScrollView of category chip buttons
 */
export function CategoryFilter({ categories, selected, onSelect, testID }: Props) {
  const { colors, borderRadius } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      testID={testID ?? 'category-filter'}
    >
      {/* All chip */}
      <TouchableOpacity
        style={[
          styles.chip,
          {
            backgroundColor: selected === null ? colors.espresso : colors.sandLight,
            borderRadius: borderRadius.pill,
          },
        ]}
        onPress={() => onSelect(null)}
        testID="category-all"
        accessibilityLabel="All categories"
        accessibilityRole="button"
        accessibilityState={{ selected: selected === null }}
      >
        <Text
          style={[styles.chipText, { color: selected === null ? colors.white : colors.espresso }]}
        >
          All
        </Text>
      </TouchableOpacity>

      {categories.map((cat) => {
        const isSelected = selected === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? colors.espresso : colors.sandLight,
                borderRadius: borderRadius.pill,
              },
            ]}
            onPress={() => onSelect(cat.id)}
            testID={`category-${cat.id}`}
            accessibilityLabel={`${cat.label} (${cat.count} items)`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.chipText, { color: isSelected ? colors.white : colors.espresso }]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
