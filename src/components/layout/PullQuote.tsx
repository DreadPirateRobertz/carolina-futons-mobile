import React from 'react';
import { StyleSheet, View, Text, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  quote: string;
  attribution?: string;
  /** Accent color for the left border. Defaults to mountainBlue. */
  accentColor?: string;
  style?: ViewStyle;
  testID?: string;
}

/**
 * Styled pull-quote / testimonial block with left accent border.
 */
export function PullQuote({ quote, attribution, accentColor, style, testID }: Props) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.root,
        {
          borderLeftColor: accentColor ?? colors.mountainBlue,
          paddingVertical: spacing.md,
          paddingLeft: spacing.lg,
          paddingRight: spacing.sm,
          marginVertical: spacing.md,
        },
        style,
      ]}
      testID={testID}
      accessibilityRole="text"
    >
      <Text
        style={[
          styles.quote,
          {
            ...typography.bodyLarge,
            fontFamily: typography.headingFamilyRegular,
            color: colors.espresso,
          },
        ]}
      >
        {'\u201C'}{quote}{'\u201D'}
      </Text>
      {attribution && (
        <Text
          style={[
            styles.attribution,
            {
              ...typography.caption,
              fontFamily: typography.bodyFamilySemiBold,
              color: colors.espressoLight,
            },
          ]}
        >
          — {attribution}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderLeftWidth: 3,
  },
  quote: {
    fontStyle: 'italic',
  },
  attribution: {
    marginTop: 8,
  },
});
