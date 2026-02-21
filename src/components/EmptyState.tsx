import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/theme/tokens';

const ICONS: Record<string, string> = {
  cart: '🛒',
  search: '🔍',
  error: '⚠️',
  empty: '📦',
};

interface Props {
  title: string;
  message: string;
  icon?: string;
  action?: { label: string; onPress: () => void };
  testID?: string;
}

export function EmptyState({ title, message, icon, action, testID }: Props) {
  return (
    <View style={styles.container} testID={testID}>
      {icon && (
        <Text style={styles.icon} testID={testID ? `${testID}-icon` : undefined}>
          {ICONS[icon] ?? icon}
        </Text>
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={action.onPress}
          testID={testID ? `${testID}-action` : undefined}
          accessibilityRole="button"
        >
          <Text style={styles.actionLabel}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.espresso,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.espressoLight,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  actionButton: {
    backgroundColor: colors.sunsetCoral,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: borderRadius.button,
  },
  actionLabel: {
    ...typography.button,
    color: '#FFFFFF',
  },
});
