// src/components/FitScoreBadge.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme';
import { useFitScore } from '@/hooks/useFitScore';

interface FitScoreBadgeProps {
  productId: string;
  memberId: string | null;
}

export function FitScoreBadge({ productId, memberId }: FitScoreBadgeProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { score, isLoading, error } = useFitScore(productId, memberId);

  if (isLoading) {
    return (
      <View
        testID="fit-score-skeleton"
        style={{
          width: 72,
          height: 22,
          backgroundColor: colors.sandDark,
          borderRadius: borderRadius.sm,
        }}
      />
    );
  }

  if (!score || error) return null;

  return (
    <View
      testID="fit-score-badge"
      accessibilityLabel={`${score}% match for you`}
      style={{
        backgroundColor: colors.mountainBlue,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          color: colors.offWhite,
          fontFamily: typography.bodyFamily,
          fontSize: 12,
          fontWeight: '600',
        }}
      >
        {score}% match
      </Text>
    </View>
  );
}
