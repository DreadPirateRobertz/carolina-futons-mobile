import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { darkPalette, colors, borderRadius, typography } from '@/theme/tokens';

export interface NotificationToggleProps {
  label: string;
  description: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  testID?: string;
  toggleTestID?: string;
  disabled?: boolean;
}

export function NotificationToggle({
  label,
  description,
  value,
  onToggle,
  testID,
  toggleTestID,
  disabled = false,
}: NotificationToggleProps) {
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: darkPalette.surface,
          borderRadius: borderRadius.card,
          borderWidth: 1,
          borderColor: darkPalette.borderSubtle,
        },
      ]}
      testID={testID}
    >
      <View style={styles.textBlock}>
        <Text
          style={[
            styles.label,
            { color: darkPalette.textPrimary, fontFamily: typography.bodyFamilySemiBold },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.description,
            { color: darkPalette.textMuted, fontFamily: typography.bodyFamily },
          ]}
        >
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={disabled ? undefined : onToggle}
        disabled={disabled}
        testID={toggleTestID}
        accessibilityRole="switch"
        accessibilityLabel={`${label}: ${value ? 'enabled' : 'disabled'}`}
        accessibilityState={{ checked: value, disabled: !!disabled }}
        trackColor={{ false: darkPalette.surfaceElevated, true: colors.mountainBlue }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  textBlock: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 15,
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
  },
});
