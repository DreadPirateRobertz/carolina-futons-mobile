import React, { useState, useCallback } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, ScrollView } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  testID?: string;
  /** Autocomplete suggestions (product names matching current query) */
  suggestions?: string[];
  /** Recent search queries */
  recentSearches?: string[];
  /** Called when user submits a search (presses return or taps suggestion) */
  onSubmitSearch?: (query: string) => void;
  /** Called when user removes a recent search */
  onRemoveRecent?: (query: string) => void;
  /** Called when user clears all recent searches */
  onClearRecent?: () => void;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search products...',
  testID,
  suggestions = [],
  recentSearches = [],
  onSubmitSearch,
  onRemoveRecent,
  onClearRecent,
}: Props) {
  const { colors, borderRadius } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const showSuggestions = isFocused && value.length > 0 && suggestions.length > 0;
  const showRecent = isFocused && value.length === 0 && recentSearches.length > 0;
  const showDropdown = showSuggestions || showRecent;

  const handleSelectSuggestion = useCallback(
    (suggestion: string) => {
      onChangeText(suggestion);
      onSubmitSearch?.(suggestion);
      setIsFocused(false);
    },
    [onChangeText, onSubmitSearch],
  );

  const handleSubmit = useCallback(() => {
    if (value.trim()) {
      onSubmitSearch?.(value.trim());
      setIsFocused(false);
    }
  }, [value, onSubmitSearch]);

  return (
    <View testID={testID ?? 'search-bar'}>
      <View
        style={[
          styles.container,
          { backgroundColor: colors.sandLight, borderRadius: borderRadius.lg },
          showDropdown && styles.containerOpen,
        ]}
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
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay to allow suggestion tap to register
            setTimeout(() => setIsFocused(false), 150);
          }}
          onSubmitEditing={handleSubmit}
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

      {/* Autocomplete dropdown */}
      {showDropdown && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: colors.sandLight,
              borderBottomLeftRadius: borderRadius.lg,
              borderBottomRightRadius: borderRadius.lg,
            },
          ]}
          testID="search-dropdown"
        >
          {showSuggestions && (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.dropdownScroll}
              testID="search-suggestions"
            >
              {suggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={styles.dropdownItem}
                  onPress={() => handleSelectSuggestion(suggestion)}
                  testID={`suggestion-${suggestion}`}
                >
                  <Text style={[styles.dropdownIcon, { color: colors.muted }]}>🔍</Text>
                  <Text style={[styles.dropdownText, { color: colors.espresso }]} numberOfLines={1}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {showRecent && (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.dropdownScroll}
              testID="search-recent"
            >
              <View style={styles.recentHeader}>
                <Text style={[styles.recentTitle, { color: colors.muted }]}>Recent</Text>
                {onClearRecent && (
                  <TouchableOpacity onPress={onClearRecent} testID="clear-recent">
                    <Text style={[styles.recentClear, { color: colors.mountainBlue }]}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
              {recentSearches.map((query) => (
                <View key={query} style={styles.recentItem}>
                  <TouchableOpacity
                    style={styles.recentTap}
                    onPress={() => handleSelectSuggestion(query)}
                    testID={`recent-${query}`}
                  >
                    <Text style={[styles.dropdownIcon, { color: colors.muted }]}>🕐</Text>
                    <Text
                      style={[styles.dropdownText, { color: colors.espresso }]}
                      numberOfLines={1}
                    >
                      {query}
                    </Text>
                  </TouchableOpacity>
                  {onRemoveRecent && (
                    <TouchableOpacity
                      onPress={() => onRemoveRecent(query)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      testID={`remove-recent-${query}`}
                    >
                      <Text style={[styles.clear, { color: colors.muted }]}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
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
  containerOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
  dropdown: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  dropdownScroll: {
    maxHeight: 240,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  dropdownIcon: {
    fontSize: 14,
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentClear: {
    fontSize: 13,
    fontWeight: '600',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  recentTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
});
