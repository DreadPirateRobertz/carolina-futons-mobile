/**
 * @module CartScreen
 *
 * Shopping cart view displaying all items the customer has added, with quantity
 * controls, an order summary (subtotal, shipping, tax, total), a BNPL
 * (Buy Now, Pay Later) teaser for Klarna/Affirm, and a checkout button.
 * Shows a branded empty state with mountain skyline when the cart is empty.
 *
 * Shipping is free above the SHIPPING_THRESHOLD; NC sales tax is applied at
 * a flat 7% rate.
 */

import React, { useCallback, useRef, useState } from 'react';
import { Animated as RNAnimated, StyleSheet, Text, TextInput, View, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { EmptyState } from '@/components/EmptyState';
import { MountainSkyline } from '@/components/MountainSkyline';
import { useCart, type CartItem } from '@/hooks/useCart';
import { usePromoCode } from '@/hooks/usePromoCode';
import { formatPrice } from '@/utils';
import { events } from '@/services/analytics';

/** Subtotal (in dollars) above which shipping becomes free. */
const SHIPPING_THRESHOLD = 499;
/** Flat shipping charge (in dollars) when below the free-shipping threshold. */
const SHIPPING_COST = 49;
/** Placeholder tax rate applied to the subtotal (will be replaced by Stripe Tax). */
const TAX_RATE = 0.07;

/** Props for the CartScreen component. */
interface Props {
  /** Callback to navigate to the checkout flow. */
  onCheckout?: () => void;
  /** Callback for the "Start Shopping" action in the empty state. */
  onContinueShopping?: () => void;
  /** Test identifier for end-to-end tests. */
  testID?: string;
}

/**
 * Shopping cart screen with item cards, quantity stepper, order summary,
 * BNPL (Buy Now, Pay Later) teaser, and checkout Call To Action.
 *
 * @param props - {@link Props}
 * @returns The cart screen view with items or the empty-cart illustration.
 */
export function CartScreen({ onCheckout, onContinueShopping, testID }: Props) {
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();
  const { items, itemCount, subtotal, removeItem, updateQuantity, clearCart } = useCart();
  const promo = usePromoCode();
  const [promoInput, setPromoInput] = useState('');

  const discount = promo.getDiscount(subtotal);
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const taxableAmount = subtotal - discount;
  const tax = Math.round(taxableAmount * TAX_RATE * 100) / 100;
  const total = taxableAmount + shipping + tax;

  const handleApplyPromo = useCallback(() => {
    promo.applyCode(promoInput);
  }, [promo, promoInput]);

  const handleRemove = useCallback(
    (itemId: string) => {
      events.removeFromCart(itemId);
      removeItem(itemId);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    },
    [removeItem],
  );

  const handleIncrement = useCallback(
    (itemId: string, currentQty: number) => {
      updateQuantity(itemId, currentQty + 1);
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    },
    [updateQuantity],
  );

  const handleDecrement = useCallback(
    (itemId: string, currentQty: number) => {
      if (currentQty <= 1) {
        handleRemove(itemId);
      } else {
        updateQuantity(itemId, currentQty - 1);
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync();
        }
      }
    },
    [updateQuantity, handleRemove],
  );

  if (items.length === 0) {
    return (
      <View
        style={[styles.root, { backgroundColor: darkPalette.background }]}
        testID={testID ?? 'cart-screen'}
      >
        <MountainSkyline variant="sunrise" height={80} testID="cart-empty-skyline" />
        <EmptyState
          icon="cart"
          title="Your cart is empty"
          message="Browse our handcrafted futons and find the perfect fit for your space."
          action={
            onContinueShopping
              ? { label: 'Start Shopping', onPress: onContinueShopping }
              : undefined
          }
          testID="cart-empty-state"
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.root, { backgroundColor: darkPalette.background }]}
      testID={testID ?? 'cart-screen'}
    >
      {/* Mountain skyline header */}
      <MountainSkyline variant="sunset" height={50} testID="cart-skyline" />

      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <Text
          style={[
            styles.headerTitle,
            { color: darkPalette.textPrimary, fontFamily: typography.headingFamily },
          ]}
          accessibilityRole="header"
          testID="cart-header"
        >
          Cart ({itemCount})
        </Text>
        <TouchableOpacity
          onPress={clearCart}
          testID="cart-clear-button"
          accessibilityLabel="Clear all items from cart"
          accessibilityRole="button"
        >
          <Text style={[styles.clearText, { color: colors.mountainBlue }]}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cart Items */}
        {items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            onIncrement={() => handleIncrement(item.id, item.quantity)}
            onDecrement={() => handleDecrement(item.id, item.quantity)}
            onRemove={() => handleRemove(item.id)}
            colors={colors}
            spacing={spacing}
            borderRadius={borderRadius}
            shadows={shadows}
          />
        ))}

        {/* Promo Code */}
        <View
          style={[
            styles.promoCard,
            {
              backgroundColor: colors.sandLight,
              borderRadius: borderRadius.card,
              marginHorizontal: spacing.lg,
            },
            shadows.card,
          ]}
          testID="promo-code-section"
        >
          {promo.status === 'applied' && promo.coupon ? (
            <View style={styles.promoApplied} testID="promo-applied">
              <View style={styles.promoAppliedInfo}>
                <Text style={[styles.promoAppliedCode, { color: colors.success }]}>
                  {promo.coupon.code}
                </Text>
                <Text style={[styles.promoAppliedName, { color: colors.espressoLight }]}>
                  {promo.coupon.discountType === 'percentage'
                    ? `${promo.coupon.discountValue}% off`
                    : `${formatPrice(promo.coupon.discountValue)} off`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={promo.removeCode}
                testID="promo-remove-button"
                accessibilityLabel="Remove promo code"
                accessibilityRole="button"
              >
                <Text style={[styles.promoRemoveText, { color: colors.sunsetCoral }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.promoInputRow}>
                <TextInput
                  style={[
                    styles.promoInput,
                    {
                      backgroundColor: colors.sandDark,
                      borderRadius: borderRadius.sm,
                      color: colors.espresso,
                    },
                  ]}
                  placeholder="Promo code"
                  placeholderTextColor={colors.muted}
                  value={promoInput}
                  onChangeText={setPromoInput}
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={handleApplyPromo}
                  editable={promo.status !== 'validating'}
                  testID="promo-input"
                />
                <TouchableOpacity
                  style={[
                    styles.promoApplyButton,
                    {
                      backgroundColor: colors.mountainBlue,
                      borderRadius: borderRadius.sm,
                    },
                    promo.status === 'validating' && styles.promoApplyDisabled,
                  ]}
                  onPress={handleApplyPromo}
                  disabled={promo.status === 'validating'}
                  testID="promo-apply-button"
                  accessibilityLabel="Apply promo code"
                  accessibilityRole="button"
                >
                  {promo.status === 'validating' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" testID="promo-loading" />
                  ) : (
                    <Text style={styles.promoApplyText}>Apply</Text>
                  )}
                </TouchableOpacity>
              </View>
              {promo.status === 'error' && promo.error && (
                <Text style={[styles.promoError, { color: colors.sunsetCoral }]} testID="promo-error">
                  {promo.error}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Order Summary */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.sandLight,
              borderRadius: borderRadius.card,
              marginHorizontal: spacing.lg,
            },
            shadows.card,
          ]}
          testID="order-summary"
        >
          <Text
            style={[
              styles.summaryTitle,
              { color: colors.espresso, fontFamily: typography.bodyFamilyBold },
            ]}
          >
            Order Summary
          </Text>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.espressoLight }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.espresso }]} testID="cart-subtotal">
              {formatPrice(subtotal)}
            </Text>
          </View>

          {discount > 0 && (
            <View style={styles.summaryRow} testID="cart-discount-row">
              <Text style={[styles.summaryLabel, { color: colors.success }]}>
                Discount ({promo.coupon?.code})
              </Text>
              <Text style={[styles.summaryValue, { color: colors.success }]} testID="cart-discount">
                −{formatPrice(discount)}
              </Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.espressoLight }]}>Shipping</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: shipping === 0 ? colors.success : colors.espresso },
              ]}
              testID="cart-shipping"
            >
              {shipping === 0 ? 'FREE' : formatPrice(shipping)}
            </Text>
          </View>

          {shipping > 0 && (
            <Text
              style={[styles.shippingNote, { color: colors.mountainBlue }]}
              testID="free-shipping-note"
            >
              Free shipping on orders over {formatPrice(SHIPPING_THRESHOLD)}
            </Text>
          )}

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.espressoLight }]}>Tax (7%)</Text>
            <Text style={[styles.summaryValue, { color: colors.espresso }]} testID="cart-tax">
              {formatPrice(tax)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.sandDark }]} />

          <View style={styles.summaryRow}>
            <Text
              style={[
                styles.totalLabel,
                { color: colors.espresso, fontFamily: typography.headingFamily },
              ]}
            >
              Total
            </Text>
            <Text
              style={[
                styles.totalValue,
                { color: colors.espresso, fontFamily: typography.headingFamily },
              ]}
              testID="cart-total"
            >
              {formatPrice(total)}
            </Text>
          </View>
        </View>

        {/* BNPL teaser */}
        <View
          style={[
            styles.bnplTeaser,
            {
              backgroundColor: colors.mountainBlueLight,
              borderRadius: borderRadius.md,
              marginHorizontal: spacing.lg,
            },
          ]}
          testID="bnpl-teaser"
        >
          <Text style={[styles.bnplText, { color: colors.mountainBlueDark }]}>
            Or 4 interest-free payments of{' '}
            <Text style={styles.bnplAmount}>{formatPrice(total / 4)}</Text> with Klarna or Affirm
          </Text>
        </View>

        {/* Checkout button */}
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}>
          <TouchableOpacity
            style={[
              styles.checkoutButton,
              {
                backgroundColor: colors.sunsetCoral,
                borderRadius: borderRadius.button,
              },
              shadows.button,
            ]}
            onPress={() => {
              events.beginCheckout(itemCount, total);
              onCheckout?.();
            }}
            testID="checkout-button"
            accessibilityLabel={`Proceed to checkout, total ${formatPrice(total)}`}
            accessibilityRole="button"
          >
            <Text style={styles.checkoutButtonText}>Checkout — {formatPrice(total)}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Renders the red "Delete" action behind a swipeable cart item.
 */
function renderDeleteAction(
  _progress: RNAnimated.AnimatedInterpolation<number>,
  dragX: RNAnimated.AnimatedInterpolation<number>,
  borderRadius: number,
) {
  const opacity = dragX.interpolate({
    inputRange: [-80, -40, 0],
    outputRange: [1, 0.6, 0],
    extrapolate: 'clamp',
  });

  return (
    <RNAnimated.View
      style={[
        styles.deleteAction,
        { borderRadius, opacity },
      ]}
      testID="swipe-delete-action"
    >
      <Text style={styles.deleteActionText}>Delete</Text>
    </RNAnimated.View>
  );
}

/**
 * Individual cart line item row showing fabric color swatch, product name,
 * fabric name, quantity stepper (capped at 10), and line total.
 * Wrapped in Swipeable for swipe-to-delete, with spring bounce on qty buttons.
 */
function CartItemRow({
  item,
  onIncrement,
  onDecrement,
  onRemove,
  colors,
  spacing,
  borderRadius: br,
  shadows: sh,
}: {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  colors: any;
  spacing: any;
  borderRadius: any;
  shadows: any;
}) {
  const lineTotal = item.unitPrice * item.quantity;
  const swipeableRef = useRef<Swipeable>(null);

  const handleSwipeOpen = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    swipeableRef.current?.close();
    onRemove();
  }, [onRemove]);

  const decrementScale = useSharedValue(1);
  const incrementScale = useSharedValue(1);
  const decrementStyle = useAnimatedStyle(() => ({
    transform: [{ scale: decrementScale.value }],
  }));
  const incrementStyle = useAnimatedStyle(() => ({
    transform: [{ scale: incrementScale.value }],
  }));

  const handleDecrement = useCallback(() => {
    decrementScale.value = withSpring(1, { damping: 4, stiffness: 300 });
    decrementScale.value = 0.85;
    onDecrement();
  }, [onDecrement, decrementScale]);

  const handleIncrement = useCallback(() => {
    incrementScale.value = withSpring(1, { damping: 4, stiffness: 300 });
    incrementScale.value = 0.85;
    onIncrement();
  }, [onIncrement, incrementScale]);

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={(progress, dragX) =>
        renderDeleteAction(progress, dragX, br.card)
      }
      onSwipeableOpen={handleSwipeOpen}
      rightThreshold={80}
      overshootRight={false}
      testID={`cart-item-swipeable-${item.id}`}
    >
      <View
        style={[
          styles.itemCard,
          {
            backgroundColor: colors.sandLight,
            borderRadius: br.card,
            marginHorizontal: spacing.lg,
          },
          sh.card,
        ]}
        testID={`cart-item-${item.id}`}
      >
        {/* Fabric color indicator + product info */}
        <View style={styles.itemTop}>
          <View
            style={[styles.fabricDot, { backgroundColor: item.fabric.color }]}
            testID={`cart-item-fabric-${item.id}`}
          />
          <View style={styles.itemInfo}>
            <Text
              style={[styles.itemName, { color: colors.espresso }]}
              testID={`cart-item-name-${item.id}`}
            >
              {item.model.name}
            </Text>
            <Text
              style={[styles.itemFabric, { color: colors.espressoLight }]}
              testID={`cart-item-fabric-name-${item.id}`}
            >
              {item.fabric.name}
              {item.fabric.price > 0 && ` (+${formatPrice(item.fabric.price)})`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onRemove}
            testID={`cart-item-remove-${item.id}`}
            accessibilityLabel={`Remove ${item.model.name} from cart`}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.removeText, { color: colors.muted }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Quantity + price */}
        <View style={styles.itemBottom}>
          <View style={styles.quantityRow}>
            <Animated.View testID={`qty-btn-animated-decrement-${item.id}`} style={decrementStyle}>
              <TouchableOpacity
                style={[styles.qtyButton, { backgroundColor: colors.sandDark, borderRadius: br.sm }]}
                onPress={handleDecrement}
                testID={`cart-item-decrement-${item.id}`}
                accessibilityLabel="Decrease quantity"
                accessibilityRole="button"
              >
                <Text style={[styles.qtyButtonText, { color: colors.espresso }]}>−</Text>
              </TouchableOpacity>
            </Animated.View>
            <Text
              style={[styles.qtyValue, { color: colors.espresso }]}
              testID={`cart-item-qty-${item.id}`}
              accessibilityLabel={`Quantity: ${item.quantity}`}
            >
              {item.quantity}
            </Text>
            <Animated.View testID={`qty-btn-animated-increment-${item.id}`} style={incrementStyle}>
              <TouchableOpacity
                style={[
                  styles.qtyButton,
                  { backgroundColor: colors.sandDark, borderRadius: br.sm },
                  item.quantity >= 10 && styles.qtyButtonDisabled,
                ]}
                onPress={handleIncrement}
                disabled={item.quantity >= 10}
                testID={`cart-item-increment-${item.id}`}
                accessibilityLabel="Increase quantity"
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.qtyButtonText,
                    { color: item.quantity >= 10 ? colors.muted : colors.espresso },
                  ]}
                >
                  +
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
          <Text
            style={[styles.itemPrice, { color: colors.espresso }]}
            testID={`cart-item-price-${item.id}`}
          >
            {formatPrice(lineTotal)}
          </Text>
        </View>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    gap: 12,
  },
  // Swipe delete action
  deleteAction: {
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 24,
    flex: 1,
    marginHorizontal: 16,
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Cart item
  itemCard: {
    padding: 16,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fabricDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemFabric: {
    fontSize: 13,
    marginTop: 2,
  },
  removeText: {
    fontSize: 16,
    fontWeight: '600',
    paddingLeft: 8,
  },
  itemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtyButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonDisabled: {
    opacity: 0.5,
  },
  qtyButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  // Promo code
  promoCard: {
    padding: 16,
    marginTop: 8,
  },
  promoInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  promoInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  promoApplyButton: {
    height: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoApplyDisabled: {
    opacity: 0.7,
  },
  promoApplyText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  promoError: {
    fontSize: 13,
    marginTop: 8,
  },
  promoApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoAppliedInfo: {
    flex: 1,
  },
  promoAppliedCode: {
    fontSize: 15,
    fontWeight: '700',
  },
  promoAppliedName: {
    fontSize: 13,
    marginTop: 2,
  },
  promoRemoveText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Summary
  summaryCard: {
    padding: 20,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 15,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  shippingNote: {
    fontSize: 12,
    marginBottom: 10,
    marginTop: -4,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  // BNPL
  bnplTeaser: {
    padding: 14,
    alignItems: 'center',
  },
  bnplText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  bnplAmount: {
    fontWeight: '700',
  },
  // Checkout
  checkoutButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
