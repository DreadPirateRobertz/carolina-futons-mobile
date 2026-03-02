import React, { useCallback } from 'react';
import { StyleSheet, Pressable, Text, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { type Product } from '@/data/products';
import { useWishlist } from '@/hooks/useWishlist';
import { POP_SPRING, PRESS_SCALE } from '@/theme/animations';

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

export function WishlistButton({ product, size = 'md', overlay = false, testID }: Props) {
  const { isInWishlist, toggle } = useWishlist();
  const active = isInWishlist(product.id);

  const dims = SIZE_MAP[size];
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(PRESS_SCALE.icon, POP_SPRING);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, POP_SPRING);
  }, [scale]);

  const handlePress = useCallback(() => {
    // Bounce pop on toggle
    scale.value = withSpring(1.2, POP_SPRING);
    setTimeout(() => {
      scale.value = withSpring(1, POP_SPRING);
    }, 100);

    toggle(product);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [toggle, product, scale]);

  return (
    <Animated.View
      style={[
        animatedStyle,
        overlay && styles.overlay,
      ]}
    >
      <Pressable
        style={[
          styles.button,
          {
            width: dims.button,
            height: dims.button,
            borderRadius: dims.button / 2,
          },
          active && styles.active,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={testID ?? `wishlist-btn-${product.id}`}
        accessibilityLabel={
          active ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`
        }
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.icon, { fontSize: dims.icon }]}>{active ? '♥' : '♡'}</Text>
      </Pressable>
    </Animated.View>
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
