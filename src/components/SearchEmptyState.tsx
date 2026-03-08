/**
 * @module SearchEmptyState
 *
 * Empty state shown when a search returns zero results. Displays the search
 * query, a branded illustration, category suggestion chips for browsing,
 * and trending product search terms. Designed to keep users engaged rather
 * than hitting a dead end.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { SearchIllustration } from '@/components/illustrations/SearchIllustration';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import type { ProductCategory } from '@/data/products';

const TRENDING_SEARCHES = [
  'futon mattress',
  'queen size',
  'wall bed',
  'slipcover',
  'memory foam',
];

interface CategoryItem {
  id: ProductCategory;
  label: string;
}

interface Props {
  query: string;
  categories: CategoryItem[];
  onCategoryPress: (categoryId: ProductCategory) => void;
  onTrendingPress: (term: string) => void;
  testID?: string;
}

export function SearchEmptyState({
  query,
  categories,
  onCategoryPress,
  onTrendingPress,
  testID = 'search-empty-state',
}: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  const accessibilityLabel = query ? `No results for "${query}"` : 'No results found';

  return (
    <View
      style={styles.content}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    >
      <SearchIllustration width={200} height={140} testID="search-empty-illustration" />

      <Text style={[styles.title, { color: colors.espresso, fontFamily: typography.headingFamily }]}>
        {accessibilityLabel}
      </Text>
      <Text style={[styles.message, { color: colors.espressoLight }]}>
        Try browsing by category instead
      </Text>

      <View style={[styles.chipsContainer, { gap: spacing.sm }]} testID="category-chips">
        {categories.map((cat) => (
          <AnimatedPressable
            key={cat.id}
            style={[
              styles.chip,
              {
                backgroundColor: colors.sandLight,
                borderRadius: borderRadius.pill,
                borderColor: colors.sandDark,
              },
            ]}
            onPress={() => onCategoryPress(cat.id)}
            testID={`category-chip-${cat.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Browse ${cat.label}`}
            haptic="light"
          >
            <Text style={[styles.chipText, { color: colors.espresso }]}>{cat.label}</Text>
          </AnimatedPressable>
        ))}
      </View>

      <View style={[styles.trendingSection, { marginTop: spacing.lg }]} testID="trending-section">
        <Text
          style={[styles.trendingTitle, { color: colors.espressoLight }]}
          accessibilityRole="header"
        >
          Trending Searches
        </Text>
        <View style={[styles.chipsContainer, { gap: spacing.sm }]}>
          {TRENDING_SEARCHES.map((term, index) => (
            <AnimatedPressable
              key={term}
              style={[
                styles.trendingChip,
                {
                  backgroundColor: colors.mountainBlue,
                  borderRadius: borderRadius.pill,
                },
              ]}
              onPress={() => onTrendingPress(term)}
              testID={`trending-chip-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`Search for ${term}`}
              haptic="light"
            >
              <Text style={[styles.trendingChipText, { color: colors.offWhite }]}>{term}</Text>
            </AnimatedPressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  trendingSection: {
    width: '100%',
    alignItems: 'center',
  },
  trendingTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendingChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  trendingChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
