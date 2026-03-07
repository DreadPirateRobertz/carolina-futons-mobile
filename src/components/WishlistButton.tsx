/**
 * @module WishlistButton
 *
 * Heart-shaped toggle button that adds or removes a product from the
 * user's wishlist. Provides spring-bounce animation and haptic feedback
 * on tap. Can be rendered as an overlay (absolute-positioned) on product
 * images or inline in content areas.
 */

import React, { useCallback } from 'react';
import { StyleSheet, Pressable, Text, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
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

const SPRING_CONFIG = { damping: 10, stiffness: 400 };

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

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const dims = SIZE_MAP[size];

  const handlePress = useCallback(() => {
    const wasActive = isInWishlist(product.id);
    toggle(product);

    // Spring bounce: quick overshoot then settle
    scale.value = withSequence(
      withSpring(1.3, SPRING_CONFIG),
      withSpring(1, SPRING_CONFIG),
    );

    if (Platform.OS !== 'web') {
      if (wasActive) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [toggle, product, isInWishlist, scale]);

  return (
    <Pressable
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
      <Animated.View style={animatedStyle}>
        <Text style={[styles.icon, { fontSize: dims.icon }]}>{active ? '♥' : '♡'}</Text>
      </Animated.View>
    </Pressable>
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
