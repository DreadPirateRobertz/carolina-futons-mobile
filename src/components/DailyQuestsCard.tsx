/**
 * @module DailyQuestsCard
 *
 * Compact HomeScreen widget showing today's 3 daily quests with checkbox UI.
 * Header shows completion count. Tapping an incomplete row navigates to the
 * relevant screen; tapping a completed row shows a celebration toast.
 *
 * Data: useDailyQuests hook (mock until cf-6tv webMethod ships).
 * Midnight refresh handled by useDailyQuests.
 *
 * cf-mz3
 */

import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/theme';
import { useDailyQuests, type QuestAction } from '@/hooks/useDailyQuests';
import type { RootStackParamList } from '@/navigation/AppNavigator';

interface Props {
  /** Override navigation for testing or custom routing */
  onNavigate?: (action: QuestAction) => void;
}

const BOUNCE_SCALE = 1.12;

function navigateForAction(
  action: QuestAction,
  navigate: NativeStackNavigationProp<RootStackParamList>['navigate'],
): void {
  switch (action) {
    case 'purchase':
    case 'browse':
      navigate('Tabs', { screen: 'Shop' });
      break;
    case 'review':
      navigate('OrderHistory');
      break;
    case 'ar':
      navigate('AR');
      break;
    case 'wishlist':
    case 'wishlist_share':
      navigate('Wishlist');
      break;
    case 'referral':
      navigate('Loyalty');
      break;
  }
}

export function DailyQuestsCard({ onNavigate }: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { quests, loading } = useDailyQuests();
  const [toastVisible, setToastVisible] = useState(false);

  const completedCount = quests.filter((q) => q.completed).length;

  const handleRowPress = useCallback(
    (_questId: string, action: QuestAction, completed: boolean) => {
      if (completed) {
        setToastVisible(true);
        // Auto-hide toast
        setTimeout(() => setToastVisible(false), 2000);
        return;
      }
      if (onNavigate) {
        onNavigate(action);
      } else {
        navigateForAction(action, navigation.navigate);
      }
    },
    [onNavigate, navigation],
  );

  return (
    <View
      testID="daily-quests-card"
      style={[
        styles.card,
        {
          backgroundColor: colors.espresso,
          borderRadius: borderRadius.card,
          padding: spacing.md,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[
            styles.headerTitle,
            { color: colors.sandBase, fontFamily: typography.headingFamily },
          ]}
        >
          Daily Quests
        </Text>
        <Text
          testID="daily-quests-count"
          style={[styles.headerCount, { color: colors.mountainBlueLight }]}
        >
          {`${completedCount} of 3 complete`}
        </Text>
      </View>

      {/* Loading skeleton */}
      {loading ? (
        <View testID="daily-quests-loading" style={styles.loadingRows}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.skeletonRow,
                { backgroundColor: colors.espressoLight, borderRadius: borderRadius.sm },
              ]}
            />
          ))}
        </View>
      ) : (
        /* Quest rows */
        <View style={styles.rows}>
          {quests.map((quest) => (
            <QuestRow
              key={quest.id}
              quest={quest}
              onPress={handleRowPress}
              colors={colors}
              spacing={spacing}
              borderRadius={borderRadius}
            />
          ))}
        </View>
      )}

      {/* Celebration toast */}
      {toastVisible && (
        <View
          testID="daily-quests-toast"
          style={[
            styles.toast,
            {
              backgroundColor: colors.sunsetCoral,
              borderRadius: borderRadius.pill,
            },
          ]}
        >
          <Text style={styles.toastText}>Quest complete!</Text>
        </View>
      )}
    </View>
  );
}

// ── QuestRow ───────────────────────────────────────────────────────────────

interface QuestRowProps {
  quest: ReturnType<typeof useDailyQuests>['quests'][number];
  onPress: (id: string, action: QuestAction, completed: boolean) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  borderRadius: ReturnType<typeof useTheme>['borderRadius'];
}

function QuestRow({ quest, onPress, colors, spacing, borderRadius }: QuestRowProps) {
  const { id, title, action, pointReward, completed } = quest;

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    if (completed) {
      scale.value = withSequence(
        withSpring(BOUNCE_SCALE, { damping: 4 }),
        withSpring(1, { damping: 6 }),
      );
    }
    onPress(id, action as QuestAction, completed);
  };

  const a11yLabel = completed
    ? `${title}, ${pointReward} points, complete`
    : `${title}, earn ${pointReward} points`;

  return (
    <Animated.View
      style={animatedStyle}
      testID={completed ? `daily-quest-complete-${id}` : undefined}
    >
      <TouchableOpacity
        testID={`daily-quest-row-${id}`}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={[
          styles.row,
          { paddingVertical: spacing.sm },
          completed && styles.rowCompleted,
        ]}
      >
        {/* Checkbox */}
        <View
          testID={`daily-quest-checkbox-${id}`}
          accessibilityState={{ checked: completed }}
          style={[
            styles.checkbox,
            {
              borderRadius: borderRadius.pill,
              borderColor: completed ? colors.sunsetCoral : colors.mountainBlueLight,
              backgroundColor: completed ? colors.sunsetCoral : 'transparent',
            },
          ]}
        >
          {completed && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </View>

        {/* Title */}
        <Text
          style={[
            styles.questTitle,
            {
              color: completed ? colors.mountainBlueLight : colors.sandBase,
            },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Reward badge */}
        <View
          testID={`daily-quest-reward-${id}`}
          style={[
            styles.rewardBadge,
            {
              backgroundColor: completed ? colors.espressoLight : colors.mountainBlueDark,
              borderRadius: borderRadius.pill,
              paddingHorizontal: spacing.xs,
              paddingVertical: 2,
            },
          ]}
        >
          <Text style={[styles.rewardText, { color: completed ? colors.mountainBlueLight : colors.sandBase }]}>
            {`+${pointReward} pts`}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingRows: {
    gap: 8,
  },
  skeletonRow: {
    height: 28,
  },
  rows: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowCompleted: {
    opacity: 0.75,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 12,
  },
  questTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  rewardBadge: {},
  rewardText: {
    fontSize: 11,
    fontWeight: '700',
  },
  toast: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  toastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
