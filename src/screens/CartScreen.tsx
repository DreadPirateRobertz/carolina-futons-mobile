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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { BNPLModal } from '@/components/BNPLModal';
import { BNPLHeroSurface } from '@/components/BNPLHeroSurface';
import { BrandedSpinner } from '@/components/BrandedSpinner';
import { CartItemDeliveryEstimate } from '@/components/CartItemDeliveryEstimate';
import { EmptyState } from '@/components/EmptyState';
import { MountainSkyline } from '@/components/MountainSkyline';
import { useCart, type CartItem } from '@/hooks/useCart';
import { useCartSessions } from '@/hooks/useCartSessions';
import { usePromoCode } from '@/hooks/usePromoCode';
import { useAuth } from '@/hooks/useAuth';
import { FUTON_MODELS, FABRICS } from '@/data/futons';
import { formatPrice } from '@/utils';
import { events } from '@/services/analytics';
import { CartPointsSummary } from '@/components/CartPointsSummary';
import { TierProgressBar } from '@/components/TierProgressBar';
import { useLoyalty } from '@/hooks/useLoyalty';
import { BundleSuggestion } from '@/components/BundleSuggestion';
import { modelIdToProductId } from '@/utils';

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
  const {
    items,
    itemCount,
    subtotal,
    removeItem,
    updateQuantity,
    clearCart,
    loadItems,
    syncError,
    clearSyncError,
  } = useCart();
  const { isAuthenticated, user } = useAuth();
  const cartSessions = useCartSessions({ memberId: user?.id ?? null });

  // Persist cart to Wix CartSessions on every change
  useEffect(() => {
    if (items.length === 0) return;
    const sessionItems = items.map((item) => ({
      productId: item.model.id,
      variantId: item.fabric.id,
      quantity: item.quantity,
    }));
    cartSessions.saveCart(sessionItems);
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge guest cart into member cart on login
  const prevAuthRef = useRef(isAuthenticated);
  useEffect(() => {
    const wasGuest = !prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;
    if (!wasGuest || !isAuthenticated || !user?.id) return;

    cartSessions.mergeOnLogin(user.id).then((merged) => {
      if (merged.length === 0) return;
      const cartItems: CartItem[] = merged
        .map((si) => {
          const model = FUTON_MODELS.find((m) => m.id === si.productId);
          const fabric = FABRICS.find((f) => f.id === si.variantId);
          if (!model || !fabric) return null;
          return {
            id: `${model.id}:${fabric.id}`,
            model,
            fabric,
            quantity: si.quantity,
            unitPrice: model.basePrice + fabric.price,
          } satisfies CartItem;
        })
        .filter((item): item is CartItem => item !== null);
      if (cartItems.length > 0) loadItems(cartItems);
    });
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps
  const promo = usePromoCode();
  const { points } = useLoyalty();
  const [promoInput, setPromoInput] = useState('');
  const [bnplModalVisible, setBnplModalVisible] = useState(false);

  const discount = promo.getDiscount(subtotal);
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const taxableAmount = subtotal - discount;
  const tax = Math.round(taxableAmount * TAX_RATE * 100) / 100;
  const total = taxableAmount + shipping + tax;

  const handleApplyPromo = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        {syncError && (
          <View
            style={[styles.syncErrorBanner, { backgroundColor: colors.sunsetCoral }]}
            testID="cart-sync-error"
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            <Text style={styles.syncErrorText}>{syncError}</Text>
            <TouchableOpacity
              onPress={clearSyncError}
              testID="cart-sync-dismiss"
              accessibilityLabel="Dismiss cart sync error"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.syncErrorDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          <MountainSkyline variant="sunrise" height={80} testID="cart-empty-skyline" />
        </View>
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
      {/* Mountain skyline header (decorative) */}
      <View accessible={false} importantForAccessibility="no-hide-descendants">
        <MountainSkyline variant="sunset" height={50} testID="cart-skyline" />
      </View>

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
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
            clearCart();
          }}
          testID="cart-clear-button"
          accessibilityLabel="Clear all items from cart"
          accessibilityRole="button"
        >
          <Text style={[styles.clearText, { color: colors.mountainBlue }]}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {syncError && (
        <View
          style={[styles.syncErrorBanner, { backgroundColor: colors.sunsetCoral }]}
          testID="cart-sync-error"
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <Text style={styles.syncErrorText}>{syncError}</Text>
          <TouchableOpacity
            onPress={clearSyncError}
            testID="cart-sync-dismiss"
            accessibilityLabel="Dismiss cart sync error"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.syncErrorDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

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

        {/* Bundle Suggestion — based on first cart item */}
        {items.length > 0 && (
          <BundleSuggestion
            productId={modelIdToProductId(items[0].model.id)}
            testID="bundle-suggestion-cart"
          />
        )}

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
                  accessibilityLabel="Promo code"
                  accessibilityHint="Enter a promotional code for a discount"
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
                    <BrandedSpinner size="small" color="#FFFFFF" testID="promo-loading" />
                  ) : (
                    <Text style={styles.promoApplyText}>Apply</Text>
                  )}
                </TouchableOpacity>
              </View>
              {promo.status === 'error' && promo.error && (
                <Text
                  style={[styles.promoError, { color: colors.sunsetCoral }]}
                  testID="promo-error"
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                >
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
            accessibilityRole="header"
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

          <CartPointsSummary subtotal={subtotal} isAuthenticated={isAuthenticated} />

          {isAuthenticated && (
            <View style={styles.loyaltyProgressContainer}>
              <TierProgressBar points={points} testID="cart-loyalty-progress" />
            </View>
          )}

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

        {/* BNPL hero — prominent installment messaging */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <BNPLHeroSurface
            price={total}
            variant="cart"
            onPress={() => setBnplModalVisible(true)}
            testID="bnpl-hero-cart"
          />
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
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
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

      <BNPLModal
        visible={bnplModalVisible}
        onClose={() => setBnplModalVisible(false)}
        price={total}
        testID="bnpl-modal"
      />
    </View>
  );
}

/**
 * Animated "Delete" action revealed behind a swipeable cart item.
 */
function DeleteAction({ drag, borderRadius }: { drag: SharedValue<number>; borderRadius: number }) {
  const opacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(drag.value, [-80, -40, 0], [1, 0.6, 0], Extrapolation.CLAMP),
  }));
  return (
    <Animated.View
      style={[styles.deleteAction, { borderRadius }, opacityStyle]}
      testID="swipe-delete-action"
    >
      <Text style={styles.deleteActionText}>Delete</Text>
    </Animated.View>
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
  const swipeableRef = useRef<SwipeableMethods>(null);
  const reduceMotion = useReducedMotion();

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
    if (!reduceMotion) {
      decrementScale.value = withSpring(1, { damping: 4, stiffness: 300 });
      decrementScale.value = 0.85;
    }
    onDecrement();
  }, [onDecrement, decrementScale, reduceMotion]);

  const handleIncrement = useCallback(() => {
    if (!reduceMotion) {
      incrementScale.value = withSpring(1, { damping: 4, stiffness: 300 });
      incrementScale.value = 0.85;
    }
    onIncrement();
  }, [onIncrement, incrementScale, reduceMotion]);

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={(_progress, drag) => <DeleteAction drag={drag} borderRadius={br.card} />}
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
        accessibilityLabel={`${item.model.name}, ${item.fabric.name}, quantity ${item.quantity}, ${formatPrice(lineTotal)}`}
        accessibilityHint="Swipe left to delete"
      >
        {/* Fabric color indicator + product info */}
        <View style={styles.itemTop}>
          <View
            style={[styles.fabricDot, { backgroundColor: item.fabric.color }]}
            testID={`cart-item-fabric-${item.id}`}
            accessible={false}
            importantForAccessibility="no"
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
            <CartItemDeliveryEstimate item={item} testID={`cart-item-delivery-${item.id}`} />
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
                style={[
                  styles.qtyButton,
                  { backgroundColor: colors.sandDark, borderRadius: br.sm },
                ]}
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
    </ReanimatedSwipeable>
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
  loyaltyProgressContainer: {
    marginTop: 12,
    marginBottom: 4,
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
  // Sync error banner
  syncErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  syncErrorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  syncErrorDismiss: {
    color: '#FFFFFF',
    fontSize: 16,
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
