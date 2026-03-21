/**
 * VisualSearchEmptyState — shown when a visual search returns 0 results.
 * This is NOT SearchEmptyState — different props, different copy, different CTAs.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  onBrowseAll: () => void;
  testID?: string;
}

export function VisualSearchEmptyState({ onBrowseAll, testID }: Props) {
  const { colors, spacing, borderRadius } = useTheme();

  return (
    <View style={styles.root} testID={testID ?? 'visual-search-empty-state'}>
      <Text style={styles.icon}>🔍</Text>
      <Text style={[styles.heading, { color: colors.espresso }]}>
        No similar products found
      </Text>
      <Text style={[styles.body, { color: colors.espressoLight }]}>
        Try a clearer photo showing the furniture directly.
      </Text>
      <TouchableOpacity
        style={[
          styles.cta,
          { backgroundColor: colors.sunsetCoral, borderRadius: borderRadius.button },
        ]}
        onPress={onBrowseAll}
        accessibilityRole="button"
        accessibilityLabel="Browse all products"
        testID="browse-all-btn"
      >
        <Text style={styles.ctaText}>Browse All</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  icon: { fontSize: 48, marginBottom: 8 },
  heading: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  cta: { paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  ctaText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
