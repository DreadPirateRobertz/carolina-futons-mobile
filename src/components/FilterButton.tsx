import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  activeCount: number;
  onPress: () => void;
  testID?: string;
}

export function FilterButton({ activeCount, onPress, testID }: Props) {
  const { colors, borderRadius } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: colors.sandLight, borderRadius: borderRadius.md },
      ]}
      onPress={onPress}
      testID={testID ?? 'filter-button'}
      accessibilityLabel={
        activeCount > 0 ? `Filters, ${activeCount} active` : 'Filters'
      }
      accessibilityRole="button"
    >
      <Text style={[styles.icon, { color: colors.espresso }]}>☰</Text>
      <Text style={[styles.label, { color: colors.espresso }]}>Filter</Text>
      {activeCount > 0 && (
        <View
          style={[styles.badge, { backgroundColor: colors.sunsetCoral }]}
          testID="filter-badge"
        >
          <Text style={[styles.badgeText, { color: colors.white }]}>{activeCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  icon: {
    fontSize: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
