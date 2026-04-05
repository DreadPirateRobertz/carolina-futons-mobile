/**
 * @module OrderConfirmationScreen
 *
 * Post-purchase success screen shown immediately after checkout completes.
 * Displays the order number, itemized receipt, shipping cost, tax,
 * estimated delivery window, and CTAs (Call To Action) to continue
 * shopping or view order history.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { PointsToast } from '@/components/PointsToast';
import { useTheme } from '@/theme';
import { formatPrice } from '@/utils';
import { useRatingPrompt } from '@/hooks/useRatingPrompt';
import { usePostPurchaseReviewPush } from '@/hooks/usePostPurchaseReviewPush';
import { useNotifications } from '@/hooks/useNotifications';
import { events } from '@/services/analytics';
import type { OrderConfirmation } from '@/services/payment';

interface Props {
  order: OrderConfirmation;
  onContinueShopping?: () => void;
  onViewOrders?: () => void;
  /** Loyalty points earned for this order; shows animated toast when > 0. */
  pointsEarned?: number;
  testID?: string;
}

/** Displays a receipt-style confirmation after a successful purchase. */
export function OrderConfirmationScreen({
  order,
  onContinueShopping,
  onViewOrders,
  pointsEarned,
  testID,
}: Props) {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const { recordPurchase } = useRatingPrompt();
  const { preferences, permissionStatus } = useNotifications();
  const [toastVisible, setToastVisible] = useState(false);

  usePostPurchaseReviewPush({
    orderId: order.orderId,
    productId: order.items[0]?.model?.id ?? '',
    placedAt: order.createdAt,
    reviewPushEnabled: preferences.orderUpdates,
    permissionGranted: permissionStatus === 'granted',
  });

  const handleShareOrder = useCallback(async () => {
    const message = `I just ordered from Carolina Futons! Order #${order.orderNumber} is on its way. 🛋️`;
    try {
      const result = await Share.share({ message });
      if (result.action === Share.sharedAction) {
        events.shareOrder(order.orderId);
      }
    } catch (err) {
      if (__DEV__) console.warn('[OrderConfirmation] Share failed:', err);
    }
  }, [order.orderId, order.orderNumber]);

  useEffect(() => {
    recordPurchase();
  }, [recordPurchase]);

  useEffect(() => {
    if (pointsEarned && pointsEarned > 0) {
      setToastVisible(true);
      const timer = setTimeout(() => setToastVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [pointsEarned]);

  return (
    <View
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'order-confirmation-screen'}
    >
      <StatusBar barStyle="dark-content" />
      {pointsEarned != null && (
        <PointsToast points={pointsEarned} visible={toastVisible} testID="order-points-toast" />
      )}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success header */}
        <View style={[styles.successSection, { paddingHorizontal: spacing.lg }]}>
          <View
            style={[
              styles.checkCircle,
              { backgroundColor: colors.success, borderRadius: borderRadius.pill },
            ]}
          >
            <Text style={styles.checkMark}>✓</Text>
          </View>
          <Text
            style={[styles.successTitle, { color: colors.espresso }]}
            accessibilityRole="header"
            testID="confirmation-title"
          >
            Order Confirmed!
          </Text>
          <Text style={[styles.successMessage, { color: colors.espressoLight }]}>
            Thank you for your order. We&apos;ll send you tracking details once your futon ships.
          </Text>
        </View>

        {/* Order details card */}
        <View
          style={[
            styles.orderCard,
            {
              backgroundColor: colors.sandLight,
              borderRadius: borderRadius.card,
              marginHorizontal: spacing.lg,
            },
            shadows.card,
          ]}
          testID="order-details-card"
        >
          <View style={styles.orderHeader}>
            <Text style={[styles.orderLabel, { color: colors.espressoLight }]}>Order Number</Text>
            <Text
              style={[styles.orderNumber, { color: colors.espresso }]}
              testID="order-number"
              accessibilityLabel={`Order number ${order.orderNumber}`}
            >
              #{order.orderNumber}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.sandDark }]} />

          {/* Items */}
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow} testID={`confirmation-item-${item.id}`}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.espresso }]}>{item.model.name}</Text>
                <Text style={[styles.itemDetail, { color: colors.espressoLight }]}>
                  {item.fabric.name} x{item.quantity}
                </Text>
              </View>
              <Text style={[styles.itemPrice, { color: colors.espresso }]}>
                {formatPrice(item.unitPrice * item.quantity)}
              </Text>
            </View>
          ))}

          <View style={[styles.divider, { backgroundColor: colors.sandDark }]} />

          {/* Totals */}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.espressoLight }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: colors.espresso }]}>
              {formatPrice(order.totals.subtotal)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.espressoLight }]}>Shipping</Text>
            <Text
              style={[
                styles.totalValue,
                { color: order.totals.shipping === 0 ? colors.success : colors.espresso },
              ]}
            >
              {order.totals.shipping === 0 ? 'FREE' : formatPrice(order.totals.shipping)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.espressoLight }]}>Tax</Text>
            <Text style={[styles.totalValue, { color: colors.espresso }]}>
              {formatPrice(order.totals.tax)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.sandDark }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.grandTotalLabel, { color: colors.espresso }]}>Total Paid</Text>
            <Text
              style={[styles.grandTotalValue, { color: colors.espresso }]}
              testID="confirmation-total"
            >
              {formatPrice(order.totals.total)}
            </Text>
          </View>
        </View>

        {/* Estimated delivery */}
        <View
          style={[
            styles.deliveryCard,
            {
              backgroundColor: colors.mountainBlueLight,
              borderRadius: borderRadius.md,
              marginHorizontal: spacing.lg,
            },
          ]}
          testID="estimated-delivery"
        >
          <Text style={[styles.deliveryLabel, { color: colors.mountainBlueDark }]}>
            Estimated Delivery
          </Text>
          <Text style={[styles.deliveryDate, { color: colors.mountainBlueDark }]}>
            {order.estimatedDelivery}
          </Text>
        </View>

        {/* Actions */}
        <View style={[styles.actions, { paddingHorizontal: spacing.lg }]}>
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { borderColor: colors.espressoLight, borderRadius: borderRadius.button },
            ]}
            onPress={handleShareOrder}
            testID="share-order-button"
            accessibilityLabel="Share your order"
            accessibilityRole="button"
            accessibilityHint="Opens share sheet with your order details"
          >
            <Text style={[styles.secondaryButtonText, { color: colors.espressoLight }]}>
              Share Order ↗
            </Text>
          </TouchableOpacity>
          {onViewOrders && (
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  borderColor: colors.mountainBlue,
                  borderRadius: borderRadius.button,
                },
              ]}
              onPress={onViewOrders}
              testID="view-orders-button"
              accessibilityLabel="View your orders"
              accessibilityRole="button"
            >
              <Text style={[styles.secondaryButtonText, { color: colors.mountainBlue }]}>
                View Orders
              </Text>
            </TouchableOpacity>
          )}
          {onContinueShopping && (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.sunsetCoral,
                  borderRadius: borderRadius.button,
                },
                shadows.button,
              ]}
              onPress={onContinueShopping}
              testID="continue-shopping-button"
              accessibilityLabel="Continue shopping"
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>Continue Shopping</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
    gap: 20,
  },
  // Success header
  successSection: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 8,
  },
  checkCircle: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  // Order card
  orderCard: {
    padding: 20,
  },
  orderHeader: {
    alignItems: 'center',
    marginBottom: 4,
  },
  orderLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  // Items
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Totals
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 15,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  // Delivery
  deliveryCard: {
    padding: 16,
    alignItems: 'center',
  },
  deliveryLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  deliveryDate: {
    fontSize: 17,
    fontWeight: '700',
  },
  // Actions
  actions: {
    gap: 12,
    paddingTop: 8,
  },
  primaryButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
