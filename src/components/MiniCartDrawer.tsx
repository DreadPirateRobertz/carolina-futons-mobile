/**
 * @module MiniCartDrawer
 *
 * Slide-up mini-cart drawer — cm-2us.
 *
 * Shows a summary of the current cart (item count + subtotal) with a
 * "Checkout" CTA. Slides up from the bottom of the screen over any content.
 * Dismissed by tapping the semi-transparent backdrop or the close button.
 * Should NOT be rendered on the Checkout screen.
 *
 * Usage:
 *   <MiniCartDrawer
 *     visible={isOpen}
 *     onClose={close}
 *     onCheckout={() => navigation.navigate('Checkout')}
 *   />
 */

import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/utils';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCheckout: () => void;
  testID?: string;
}

/** Slide-up mini-cart summary drawer with checkout CTA. */
export function MiniCartDrawer({ visible, onClose, onCheckout, testID }: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const { itemCount, subtotal } = useCart();

  const handleCheckout = useCallback(() => {
    onClose();
    onCheckout();
  }, [onClose, onCheckout]);

  if (!visible) return null;

  const checkoutDisabled = itemCount === 0;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose} testID="mini-cart-backdrop">
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Drawer panel */}
      <Animated.View
        entering={SlideInDown.springify().damping(20)}
        exiting={SlideOutDown.duration(220)}
        style={[
          styles.drawer,
          {
            backgroundColor: colors.sandBase,
            borderTopLeftRadius: borderRadius.lg ?? 20,
            borderTopRightRadius: borderRadius.lg ?? 20,
          },
        ]}
        testID={testID ?? 'mini-cart-drawer'}
        accessibilityViewIsModal={true}
        accessibilityRole="none"
      >
        {/* Header row */}
        <View style={styles.header}>
          <Text
            style={[styles.title, { color: colors.espresso, fontFamily: typography.headingFamily }]}
          >
            Your Cart
          </Text>
          <TouchableOpacity
            onPress={onClose}
            testID="mini-cart-close-btn"
            accessibilityLabel="Close cart drawer"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.closeIcon, { color: colors.espresso }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Summary row */}
        <View style={[styles.summaryRow, { borderTopColor: colors.sandDark }]}>
          <View style={styles.countWrap}>
            <Text
              style={[styles.countLabel, { color: colors.espressoLight, fontFamily: typography.bodyFamily }]}
            >
              Items
            </Text>
            <Text
              style={[styles.countValue, { color: colors.espresso, fontFamily: typography.bodyFamilyBold }]}
              testID="mini-cart-item-count"
            >
              {itemCount}
            </Text>
          </View>
          <View style={styles.subtotalWrap}>
            <Text
              style={[styles.subtotalLabel, { color: colors.espressoLight, fontFamily: typography.bodyFamily }]}
            >
              Subtotal
            </Text>
            <Text
              style={[styles.subtotalValue, { color: colors.espresso, fontFamily: typography.headingFamily }]}
              testID="mini-cart-subtotal"
            >
              {formatPrice(subtotal)}
            </Text>
          </View>
        </View>

        {/* Checkout button */}
        <TouchableOpacity
          style={[
            styles.checkoutBtn,
            {
              backgroundColor: checkoutDisabled ? colors.sandDark : colors.espresso,
              borderRadius: borderRadius.pill ?? 28,
              marginHorizontal: spacing.lg,
              marginBottom: spacing.lg,
            },
          ]}
          onPress={handleCheckout}
          disabled={checkoutDisabled}
          testID="mini-cart-checkout-btn"
          accessibilityRole="button"
          accessibilityLabel={checkoutDisabled ? 'Cart is empty' : `Checkout — ${formatPrice(subtotal)}`}
          accessibilityState={{ disabled: checkoutDisabled }}
        >
          <Text style={[styles.checkoutBtnText, { fontFamily: typography.bodyFamilyBold }]}>
            {checkoutDisabled ? 'Cart is empty' : `Checkout — ${formatPrice(subtotal)}`}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: '400',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  countWrap: {
    alignItems: 'flex-start',
  },
  countLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  countValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtotalWrap: {
    alignItems: 'flex-end',
  },
  subtotalLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  subtotalValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  checkoutBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
