import React, { useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { EmptyState } from '@/components';
import { useCart, type CartItem } from '@/hooks/useCart';
import { formatPrice } from '@/utils';

const SHIPPING_THRESHOLD = 499;
const SHIPPING_COST = 49;
const TAX_RATE = 0.07; // NC sales tax

interface Props {
  onCheckout?: () => void;
  onContinueShopping?: () => void;
  testID?: string;
}

export function CartScreen({ onCheckout, onContinueShopping, testID }: Props) {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const { items, itemCount, subtotal, removeItem, updateQuantity, clearCart } = useCart();

  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + shipping + tax;

  const handleRemove = useCallback(
    (itemId: string) => {
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
        style={[styles.root, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'cart-screen'}
      >
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
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'cart-screen'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <Text
          style={[styles.headerTitle, { color: colors.espresso }]}
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
          <Text style={[styles.summaryTitle, { color: colors.espresso }]}>Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.espressoLight }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.espresso }]} testID="cart-subtotal">
              {formatPrice(subtotal)}
            </Text>
          </View>

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
            <Text style={[styles.totalLabel, { color: colors.espresso }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.espresso }]} testID="cart-total">
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
            onPress={onCheckout}
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

  return (
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
          <TouchableOpacity
            style={[styles.qtyButton, { backgroundColor: colors.sandDark, borderRadius: br.sm }]}
            onPress={onDecrement}
            testID={`cart-item-decrement-${item.id}`}
            accessibilityLabel="Decrease quantity"
            accessibilityRole="button"
          >
            <Text style={[styles.qtyButtonText, { color: colors.espresso }]}>−</Text>
          </TouchableOpacity>
          <Text
            style={[styles.qtyValue, { color: colors.espresso }]}
            testID={`cart-item-qty-${item.id}`}
            accessibilityLabel={`Quantity: ${item.quantity}`}
          >
            {item.quantity}
          </Text>
          <TouchableOpacity
            style={[
              styles.qtyButton,
              { backgroundColor: colors.sandDark, borderRadius: br.sm },
              item.quantity >= 10 && styles.qtyButtonDisabled,
            ]}
            onPress={onIncrement}
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
        </View>
        <Text
          style={[styles.itemPrice, { color: colors.espresso }]}
          testID={`cart-item-price-${item.id}`}
        >
          {formatPrice(lineTotal)}
        </Text>
      </View>
    </View>
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
