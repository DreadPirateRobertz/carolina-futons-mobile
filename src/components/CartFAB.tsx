/**
 * @module CartFAB
 *
 * Floating cart button — cm-486.
 *
 * Appears on any screen when the cart has items. Tapping opens the
 * mini-cart slide-up drawer preview without navigating away from the
 * current screen.
 *
 * Positioned bottom-left to avoid overlap with the CompareFAB (bottom-right).
 * Hidden when the cart is empty.
 */
import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useCart } from '@/hooks/useCart';
import { useMiniCartDrawer } from '@/hooks/useMiniCartDrawer';
import { colors, shadows } from '@/theme/tokens';

/** Floating action button that opens the mini-cart drawer. */
export function CartFAB() {
  const { itemCount } = useCart();
  const { open } = useMiniCartDrawer();

  if (itemCount === 0) return null;

  const badgeText = itemCount > 99 ? '99+' : String(itemCount);

  return (
    <TouchableOpacity
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`View cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
      testID="cart-fab"
      style={styles.fab}
    >
      <Text style={styles.icon}>🛒</Text>
      <View style={styles.badge} testID="cart-fab-badge-container">
        <Text style={styles.badgeText} testID="cart-fab-badge">
          {badgeText}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  icon: {
    fontSize: 22,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.sunsetCoral,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
