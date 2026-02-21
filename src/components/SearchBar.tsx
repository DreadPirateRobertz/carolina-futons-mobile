import React from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  testID?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search products...',
  testID,
}: Props) {
  const { colors, spacing, borderRadius } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.sandLight, borderRadius: borderRadius.lg },
      ]}
      testID={testID ?? 'search-bar'}
    >
      <Text style={[styles.icon, { color: colors.muted }]}>🔍</Text>
      <TextInput
        style={[styles.input, { color: colors.espresso }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        testID="search-input"
        accessibilityLabel="Search products"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          testID="search-clear"
          accessibilityLabel="Clear search"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.clear, { color: colors.muted }]}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
    padding: 0,
  },
  clear: {
    fontSize: 16,
    fontWeight: '300',
    padding: 4,
  },
});
