import React from 'react';
import { StyleSheet, View, Text, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  /** Override background color (defaults to sandBase) */
  background?: string;
  /** Remove horizontal padding */
  flush?: boolean;
  /** Spacing between section and next sibling */
  spacing?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  testID?: string;
}

/**
 * Themed section container with consistent vertical rhythm.
 * Use for major content blocks on editorial/home screens.
 */
export function Section({
  children,
  title,
  subtitle,
  background,
  flush,
  spacing: spacingSize = 'md',
  style,
  testID,
}: Props) {
  const { colors, spacing, typography } = useTheme();

  const paddingBottom =
    spacingSize === 'sm' ? spacing.md : spacingSize === 'lg' ? spacing.xxl : spacing.lg;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: background ?? colors.sandBase,
          paddingHorizontal: flush ? 0 : spacing.pagePadding,
          paddingTop: spacing.lg,
          paddingBottom,
        },
        style,
      ]}
      testID={testID}
    >
      {title && (
        <View style={flush ? { paddingHorizontal: spacing.pagePadding } : undefined}>
          <Text
            style={[
              styles.title,
              {
                ...typography.h2,
                fontFamily: typography.headingFamily,
                color: colors.espresso,
              },
            ]}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                {
                  ...typography.body,
                  fontFamily: typography.bodyFamily,
                  color: colors.espressoLight,
                },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {},
  title: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 16,
  },
});
