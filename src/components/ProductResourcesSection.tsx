/**
 * @module ProductResourcesSection
 *
 * Collapsible list of product resource items (spec sheets, care guides, videos,
 * assembly guides). Renders nothing when loading, errored, or empty.
 *
 * hq-g26rc
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useTheme } from '@/theme';
import type { ProductResource } from '@/hooks/useProductResources';

interface Props {
  resources: ProductResource[];
  loading: boolean;
  error: Error | null;
}

export function ProductResourcesSection({ resources, loading, error }: Props) {
  const { colors, spacing, typography } = useTheme();
  const [expanded, setExpanded] = useState(true);

  if (loading || error || resources.length === 0) return null;

  const handleItemPress = (url: string) => {
    Linking.openURL(url).catch(() => {
      // Silent catch — URL open failure is non-fatal
    });
  };

  return (
    <View testID="resources-section" style={[styles.section, { paddingHorizontal: spacing.lg }]}>
      <TouchableOpacity
        testID="resources-toggle"
        onPress={() => setExpanded((prev) => !prev)}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse resources' : 'Expand resources'}
      >
        <Text
          style={[styles.title, { color: colors.espresso, fontFamily: typography.bodyFamilyBold }]}
        >
          Resources
        </Text>
        <Text style={[styles.chevron, { color: colors.espressoLight }]}>
          {expanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View testID="resources-list">
          {resources.map((resource, index) => (
            <TouchableOpacity
              key={`${resource.resourceType}-${index}`}
              testID={`resource-item-${index}`}
              onPress={() => handleItemPress(resource.url)}
              style={[
                styles.item,
                { borderTopColor: colors.sandDark },
                index === 0 && styles.itemFirst,
              ]}
              accessibilityRole="link"
              accessibilityLabel={resource.label}
            >
              <Text testID={`resource-icon-${index}`} style={styles.icon}>
                {resource.icon}
              </Text>
              <Text
                style={[
                  styles.label,
                  { color: colors.espresso, fontFamily: typography.bodyFamily },
                ]}
                numberOfLines={1}
              >
                {resource.label}
              </Text>
              <Text style={[styles.arrow, { color: colors.espressoLight }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemFirst: {
    borderTopWidth: 0,
  },
  icon: {
    fontSize: 18,
    marginRight: 10,
  },
  label: {
    flex: 1,
    fontSize: 14,
  },
  arrow: {
    fontSize: 18,
    marginLeft: 8,
  },
});
