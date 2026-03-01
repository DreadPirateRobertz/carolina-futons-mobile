import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { events } from '@/services/analytics';
import type { Product } from '@/data/products';

const AR_CATEGORIES = new Set(['futons', 'frames', 'murphy-beds']);

interface Props {
  product: Product;
  onPress?: (product: Product) => void;
  size?: 'compact' | 'full';
  disabled?: boolean;
  testID?: string;
}

/**
 * "View in Your Room" button for launching AR product preview.
 * Only renders for AR-eligible products (futons/frames/murphy-beds, in-stock).
 */
export function ViewInRoomButton({
  product,
  onPress,
  size = 'full',
  disabled = false,
  testID = 'view-in-room-btn',
}: Props) {
  const { colors, borderRadius } = useTheme();

  const handlePress = useCallback(() => {
    if (disabled) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    events.arViewInRoomTap(product.id, product.category);

    onPress?.(product);
  }, [product, onPress, disabled]);

  // Don't render for non-AR-eligible products
  if (!product.inStock || !AR_CATEGORIES.has(product.category)) {
    return null;
  }

  const isCompact = size === 'compact';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: `${colors.sunsetCoral}1F`,
          borderColor: colors.sunsetCoral,
          borderRadius: borderRadius.lg,
        },
        isCompact && { ...styles.buttonCompact, borderRadius: borderRadius.md },
        disabled && styles.buttonDisabled,
      ]}
      onPress={handlePress}
      disabled={disabled}
      testID={testID}
      accessibilityLabel={`View ${product.name} in your room using AR camera`}
      accessibilityRole="button"
      accessibilityHint="Opens your camera to preview this product in your room"
      accessibilityState={{ disabled }}
      activeOpacity={0.7}
    >
      <View testID="view-in-room-camera-icon" style={styles.iconContainer}>
        <Text style={[styles.icon, isCompact && styles.iconCompact]}>{'\u{1F4F7}'}</Text>
      </View>
      {!isCompact && (
        <Text
          style={[styles.label, { color: colors.sunsetCoral }, disabled && styles.labelDisabled]}
        >
          View in Your Room
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  buttonCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
  },
  iconCompact: {
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelDisabled: {
    opacity: 0.5,
  },
});
