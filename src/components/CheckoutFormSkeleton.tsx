import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

export function CheckoutFormSkeleton() {
  const { colors, spacing, borderRadius } = useTheme();
  const s = StyleSheet.create({
    container: { padding: spacing.md },
    row: {
      height: 44,
      backgroundColor: colors.sandDark,
      borderRadius: borderRadius.sm,
      marginBottom: spacing.md,
    },
    halfRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    half: { flex: 1, height: 44, backgroundColor: colors.sandDark, borderRadius: borderRadius.sm },
    button: {
      height: 50,
      backgroundColor: colors.sandDark,
      borderRadius: borderRadius.sm,
      opacity: 0.5,
    },
  });
  return (
    <View testID="checkout-form-skeleton" style={s.container}>
      <View style={s.row} />
      <View style={s.row} />
      <View style={s.halfRow}>
        <View style={s.half} />
        <View style={s.half} />
      </View>
      <View style={s.button} />
    </View>
  );
}
