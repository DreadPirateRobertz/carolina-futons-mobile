/**
 * @module BadgeShowcaseSection
 *
 * Phase 8 social layer (cm-p8-social): horizontal badge showcase row.
 * Renders earned badges fetched from useMemberBadges. Used on
 * AchievementBadgesScreen and member profile contexts.
 *
 * hq-u6i9c / cm-p8-social
 */

import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMemberBadges } from '@/hooks/useMemberBadges';

export interface BadgeShowcaseSectionProps {
  memberId: string | null;
}

export function BadgeShowcaseSection({ memberId }: BadgeShowcaseSectionProps) {
  const { badges, loading, error } = useMemberBadges(memberId);

  if (loading) {
    return (
      <View
        testID="badge-showcase"
        style={styles.container}
        accessibilityLabel="Loading badge showcase"
      >
        <View testID="badge-showcase-loading" style={styles.center}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View testID="badge-showcase" style={styles.container} accessibilityLabel="Badge showcase">
        <View testID="badge-showcase-error" style={styles.center}>
          <Text style={styles.emptyText}>Could not load badges</Text>
        </View>
      </View>
    );
  }

  if (badges.length === 0) {
    return (
      <View
        testID="badge-showcase"
        style={styles.container}
        accessibilityLabel="Badge showcase — no badges yet"
      >
        <View testID="badge-showcase-empty" style={styles.center}>
          <Text style={styles.emptyText}>No badges earned yet</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      testID="badge-showcase"
      style={styles.container}
      accessibilityLabel={`Badge showcase — ${badges.length} badge${badges.length !== 1 ? 's' : ''} earned`}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {badges.map((badge) => (
          <View
            key={badge.badgeKey}
            testID="badge-item"
            style={styles.badge}
            accessibilityLabel={`${badge.name} badge`}
            accessibilityRole="image"
          >
            <Text style={styles.icon}>{badge.icon}</Text>
            <Text style={styles.name} numberOfLines={2}>
              {badge.name}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 80,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  scroll: {
    gap: 12,
    paddingHorizontal: 4,
  },
  badge: {
    alignItems: 'center',
    width: 64,
    gap: 4,
  },
  icon: {
    fontSize: 32,
  },
  name: {
    fontSize: 10,
    color: '#9b8a7a',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#9b8a7a',
  },
});
