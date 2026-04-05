/**
 * @module MiniCartDrawer
 *
 * Slide-up mini-cart drawer — cm-2us / cm-9sr.
 *
 * Phase 1 (cm-2us): item count + subtotal summary, checkout CTA.
 * Phase 2 (cm-9sr): CF-gsza item list (image, name, price, qty ± controls,
 *   remove), swipe-down gesture dismiss, overlay tap dismiss.
 *
 * Dismissed by: close button, backdrop tap, or swipe-down gesture
 * (translation > 100px OR velocity > 500).
 *
 * Should NOT be rendered on the Checkout screen (suppressed by MiniCartDrawerHost).
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  SlideInDown,
  SlideOutDown,
  FadeIn,
  FadeOut,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '@/theme';
import { useCart, type CartItem } from '@/hooks/useCart';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatPrice } from '@/utils';
import { wixImageUrl } from '@/utils/wixImageUrl';

const SWIPE_DISMISS_TRANSLATION = 100;
const SWIPE_DISMISS_VELOCITY = 500;

interface Props {
  visible: boolean;
  onClose: () => void;
  onCheckout: () => void;
  testID?: string;
}

// ── MiniCartItem ─────────────────────────────────────────────────────────────

interface MiniCartItemProps {
  item: CartItem;
  onRemove: (itemId: string) => void;
  onUpdateQty: (itemId: string, qty: number) => void;
}

function MiniCartItem({ item, onRemove, onUpdateQty }: MiniCartItemProps) {
  const { colors, borderRadius } = useTheme();
  const lineTotal = formatPrice(item.unitPrice * item.quantity);
  const name = `${item.model.name} — ${item.fabric.name}`;

  const handleInc = useCallback(() => {
    onUpdateQty(item.id, item.quantity + 1);
  }, [item.id, item.quantity, onUpdateQty]);

  const handleDec = useCallback(() => {
    if (item.quantity <= 1) {
      onRemove(item.id);
    } else {
      onUpdateQty(item.id, item.quantity - 1);
    }
  }, [item.id, item.quantity, onRemove, onUpdateQty]);

  const handleRemove = useCallback(() => {
    onRemove(item.id);
  }, [item.id, onRemove]);

  const fabricLabel = item.fabricName ?? item.fabric.name;
  const a11yLabel = `${item.model.name}, ${fabricLabel}, ${formatPrice(item.unitPrice)}, quantity ${item.quantity}`;

  return (
    <View style={itemStyles.row} testID={`cartItemRow-${item.id}`} accessibilityLabel={a11yLabel}>
      {/* Image / color swatch */}
      {item.imageUrl ? (
        <Image
          testID={`cartItemImage-${item.id}`}
          source={{ uri: wixImageUrl(item.imageUrl, { width: 112, height: 112 }) ?? item.imageUrl }}
          style={[itemStyles.thumb, { borderRadius: borderRadius.sm }]}
          contentFit="cover"
        />
      ) : (
        <View
          testID={`cartItemImage-${item.id}`}
          style={[
            itemStyles.thumb,
            { backgroundColor: item.fabric.color, borderRadius: borderRadius.sm },
          ]}
        />
      )}

      {/* Name + price */}
      <View style={itemStyles.info}>
        <Text
          testID={`cartItemName-${item.id}`}
          style={[itemStyles.name, { color: colors.espresso }]}
          numberOfLines={2}
        >
          {name}
        </Text>
        <Text
          testID={`cartItemPrice-${item.id}`}
          style={[itemStyles.price, { color: colors.espresso }]}
        >
          {lineTotal}
        </Text>
      </View>

      {/* Qty controls */}
      <View style={itemStyles.qtyRow}>
        <TouchableOpacity
          testID={`cartItemQtyDec-${item.id}`}
          onPress={handleDec}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={item.quantity <= 1 ? 'Remove item' : 'Decrease quantity'}
          accessibilityRole="button"
        >
          <Text style={[itemStyles.qtyBtn, { color: colors.espresso }]}>−</Text>
        </TouchableOpacity>
        <Text
          testID={`cartItemQty-${item.id}`}
          style={[itemStyles.qtyVal, { color: colors.espresso }]}
        >
          {item.quantity}
        </Text>
        <TouchableOpacity
          testID={`cartItemQtyInc-${item.id}`}
          onPress={handleInc}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Increase quantity"
          accessibilityRole="button"
        >
          <Text style={[itemStyles.qtyBtn, { color: colors.espresso }]}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Remove button */}
      <TouchableOpacity
        testID={`cartItemRemove-${item.id}`}
        onPress={handleRemove}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={`Remove ${item.model.name}`}
        accessibilityRole="button"
        style={itemStyles.removeBtn}
      >
        <Text style={[itemStyles.removeBtnText, { color: colors.espressoLight }]}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

const itemStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 22,
    minWidth: 24,
    textAlign: 'center',
  },
  qtyVal: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  removeBtn: {
    paddingLeft: 4,
  },
  removeBtnText: {
    fontSize: 18,
    fontWeight: '400',
  },
});

// ── MiniCartDrawer ───────────────────────────────────────────────────────────

/** Slide-up mini-cart drawer with item list, swipe-dismiss, and checkout CTA. */
export function MiniCartDrawer({ visible, onClose, onCheckout, testID }: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const { itemCount, subtotal, items, removeItem, updateQuantity } = useCart();
  const reduceMotion = useReducedMotion();

  const handleCheckout = useCallback(() => {
    onClose();
    onCheckout();
  }, [onClose, onCheckout]);

  const swipeGesture = Gesture.Pan()
    .minDistance(10)
    .onUpdate(() => {})
    .onEnd((e) => {
      if (e.translationY > SWIPE_DISMISS_TRANSLATION || e.velocityY > SWIPE_DISMISS_VELOCITY) {
        runOnJS(onClose)();
      }
    });

  if (!visible) return null;

  const checkoutDisabled = itemCount === 0;

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      testID={testID ?? 'mini-cart-drawer'}
      accessibilityViewIsModal={true}
      accessibilityRole="none"
    >
      {/* Backdrop */}
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        testID="mini-cart-backdrop"
        accessibilityLabel="Close cart"
      />

      {/* Drawer panel — wrapped with swipe-down gesture */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View
          entering={reduceMotion ? FadeIn.duration(150) : SlideInDown.springify().damping(20)}
          exiting={reduceMotion ? FadeOut.duration(150) : SlideOutDown.duration(220)}
          style={[
            styles.drawer,
            {
              backgroundColor: colors.sandBase,
              borderTopLeftRadius: borderRadius.lg ?? 20,
              borderTopRightRadius: borderRadius.lg ?? 20,
            },
          ]}
        >
          {/* Header row */}
          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                { color: colors.espresso, fontFamily: typography.headingFamily },
              ]}
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

          {/* Item list */}
          {items.length === 0 ? (
            <View testID="mini-cart-empty" style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: colors.espressoLight }]}>
                Your cart is empty
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.itemList} testID="mini-cart-item-list">
              {items.map((item) => (
                <MiniCartItem
                  key={item.id}
                  item={item}
                  onRemove={removeItem}
                  onUpdateQty={updateQuantity}
                />
              ))}
            </ScrollView>
          )}

          {/* Summary row */}
          <View style={[styles.summaryRow, { borderTopColor: colors.sandDark }]}>
            <View style={styles.countWrap}>
              <Text
                style={[
                  styles.countLabel,
                  { color: colors.espressoLight, fontFamily: typography.bodyFamily },
                ]}
              >
                Items
              </Text>
              <Text
                style={[
                  styles.countValue,
                  { color: colors.espresso, fontFamily: typography.bodyFamilyBold },
                ]}
                testID="mini-cart-item-count"
              >
                {itemCount}
              </Text>
            </View>
            <View style={styles.subtotalWrap}>
              <Text
                style={[
                  styles.subtotalLabel,
                  { color: colors.espressoLight, fontFamily: typography.bodyFamily },
                ]}
              >
                Subtotal
              </Text>
              <Text
                style={[
                  styles.subtotalValue,
                  { color: colors.espresso, fontFamily: typography.headingFamily },
                ]}
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
            accessibilityLabel={
              checkoutDisabled ? 'Cart is empty' : `Checkout — ${formatPrice(subtotal)}`
            }
            accessibilityState={{ disabled: checkoutDisabled }}
          >
            <Text style={[styles.checkoutBtnText, { fontFamily: typography.bodyFamilyBold }]}>
              {checkoutDisabled ? 'Cart is empty' : `Checkout — ${formatPrice(subtotal)}`}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
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
  itemList: {
    maxHeight: 280,
  },
  emptyWrap: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
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
