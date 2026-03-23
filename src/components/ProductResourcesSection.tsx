/**
 * @module ProductResourcesSection
 *
 * Collapsible "Resources" section for ProductDetailScreen.
 * Renders tappable resource items (spec sheets, care guides, videos, etc.)
 * sourced from useProductResources. Opens URLs via Linking.openURL.
 *
 * Hidden when: loading, error, or empty resources array.
 * Starts expanded. Toggle collapses/expands the list.
 *
 * hq-g26rc / Phase 7 PDP
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from '@/theme/tokens';
import { type ProductResource } from '@/hooks/useProductResources';

interface Props {
  resources: ProductResource[];
  loading: boolean;
  error: Error | null;
}

export function ProductResourcesSection({ resources, loading, error }: Props) {
  const [expanded, setExpanded] = useState(true);

  const handleToggle = useCallback(() => setExpanded((v) => !v), []);

  const handleOpen = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {
      // URL open failure — platform may have no handler; fail silently
    });
  }, []);

  if (loading || error || resources.length === 0) return null;

  return (
    <View testID="resources-section" style={styles.container}>
      {/* Header row with toggle */}
      <TouchableOpacity
        testID="resources-toggle"
        style={styles.header}
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse resources' : 'Expand resources'}
      >
        <Text style={styles.title}>Resources</Text>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Resource list */}
      {expanded && (
        <View testID="resources-list" style={styles.list}>
          {resources.map((resource, index) => (
            <TouchableOpacity
              key={`${resource.resourceType}-${resource.sortOrder}`}
              testID={`resource-item-${index}`}
              style={styles.item}
              onPress={() => handleOpen(resource.url)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${resource.label}`}
            >
              <Text testID={`resource-icon-${index}`} style={styles.icon}>
                {resource.icon}
              </Text>
              <Text style={styles.label} numberOfLines={1}>
                {resource.label}
              </Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.sandLight,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    fontFamily: typography.bodyFamilyBold,
    fontSize: 15,
    color: colors.espresso,
  },
  chevron: {
    fontSize: 11,
    color: colors.espressoLight,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.sandDark,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.sandDark,
  },
  icon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  label: {
    flex: 1,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    color: colors.espresso,
  },
  arrow: {
    fontSize: 18,
    color: colors.espressoLight,
    marginLeft: spacing.xs,
  },
});
