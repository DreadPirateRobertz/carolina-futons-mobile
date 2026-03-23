/**
 * @module ChallengesRail
 *
 * Horizontal scrolling rail of ChallengeCards for the gamification challenges section
 * on HomeScreen. Renders nothing when the challenges list is empty.
 */
import React, { memo } from 'react';
import { StyleSheet, View, Text, FlatList } from 'react-native';
import { useTheme } from '@/theme';
import { ChallengeCard } from './ChallengeCard';
import type { Challenge } from '@/data/challenges';

interface Props {
  challenges: Challenge[];
  onChallengePress?: (id: string) => void;
  testID?: string;
}

export const ChallengesRail = memo(function ChallengesRail({
  challenges,
  onChallengePress,
  testID = 'challenges-rail',
}: Props) {
  const { colors, spacing } = useTheme();

  if (challenges.length === 0) return null;

  return (
    <View testID={testID} style={styles.section}>
      <Text
        style={[styles.header, { color: colors.espresso, paddingHorizontal: spacing.lg }]}
        accessibilityRole="header"
      >
        Challenges
      </Text>
      <FlatList
        data={challenges}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: spacing.lg }]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => <ChallengeCard challenge={item} onPress={onChallengePress} />}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    marginBottom: 4,
  },
  header: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 4,
  },
  separator: {
    width: 12,
  },
});
