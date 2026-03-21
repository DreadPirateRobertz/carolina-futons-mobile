/**
 * CompareButton — toggle add/remove product from the shared compare list.
 */
import React from 'react';
import { Platform, TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useCompareContext } from '@/contexts/CompareContext';
import type { Product } from '@/data/products';

interface CompareButtonProps {
  product: Product;
  testID?: string;
}

export function CompareButton({ product, testID }: CompareButtonProps) {
  const { addToCompare, removeFromCompare, isInCompare } = useCompareContext();
  const inList = isInCompare(product.id);

  const handlePress = () => {
    if (inList) {
      removeFromCompare(product.id);
    } else {
      addToCompare(product);
    }
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={inList ? 'Remove from compare' : 'Add to compare'}
      testID={testID}
      style={[styles.button, inList && styles.active]}
    >
      <Text style={[styles.text, inList && styles.activeText]}>
        {inList ? 'Remove' : 'Compare'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8B7355',
  },
  active: {
    backgroundColor: '#8B7355',
  },
  text: {
    fontSize: 13,
    color: '#8B7355',
    fontWeight: '600',
  },
  activeText: {
    color: '#FFF',
  },
});
