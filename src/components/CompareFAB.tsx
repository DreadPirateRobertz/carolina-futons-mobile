/**
 * CompareFAB — floating action button with badge count.
 *
 * Appears when compare list has items. Navigates to CompareScreen on press.
 */
import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCompareContext } from '@/contexts/CompareContext';

interface CompareFABProps {
  testID?: string;
}

export function CompareFAB({ testID }: CompareFABProps) {
  const { compareList, count } = useCompareContext();
  const navigation = useNavigation<any>();

  if (count === 0) return null;

  const handlePress = () => {
    navigation.navigate('Compare', {
      productSlugs: compareList.map((p) => p.slug),
    });
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Compare ${count} products`}
      testID={testID}
      style={styles.fab}
    >
      <Text style={styles.icon}>⚖</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8845C',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  icon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#8B7355',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
