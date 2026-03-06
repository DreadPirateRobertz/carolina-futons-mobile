/**
 * @module WishlistButton
 *
 * Heart-shaped toggle button that adds or removes a product from the
 * user's wishlist. Provides haptic feedback on native platforms. Can be
 * rendered as an overlay (absolute-positioned) on product images or
 * inline in content areas.
 */

import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { type Product } from '@/data/products';
import { useWishlist } from '@/hooks/useWishlist';

interface Props {
  product: Product;
  size?: 'sm' | 'md' | 'lg';
  /** Render as overlay (absolute positioned, top-right) */
  overlay?: boolean;
  testID?: string;
}

const SIZE_MAP = {
  sm: { button: 28, icon: 16 },
  md: { button: 36, icon: 20 },
  lg: { button: 44, icon: 26 },
} as const;

/**
 * Toggleable heart button for adding/removing products from the wishlist.
 *
 * @param props.product - The product to add/remove
 * @param props.size - Button size: 'sm' | 'md' | 'lg'
 * @param props.overlay - When true, positions absolutely over its parent (top-right)
 * @param props.testID - Test identifier
 * @returns A circular heart-icon button
 */
export function WishlistButton({ product, size = 'md', overlay = false, testID }: Props) {
  const { isInWishlist, toggle } = useWishlist();
  const active = isInWishlist(product.id);

  const dims = SIZE_MAP[size];

  const handlePress = useCallback(() => {
    toggle(product);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [toggle, product]);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          width: dims.button,
          height: dims.button,
          borderRadius: dims.button / 2,
        },
        overlay && styles.overlay,
        active && styles.active,
      ]}
      onPress={handlePress}
      testID={testID ?? `wishlist-btn-${product.id}`}
      accessibilityLabel={
        active ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`
      }
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.icon, { fontSize: dims.icon }]}>{active ? '♥' : '♡'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  overlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 5,
  },
  active: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  icon: {
    color: '#E8845C', // sunsetCoral
  },
});
