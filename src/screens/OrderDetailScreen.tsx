import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { ORDER_STATUS_CONFIG, type Order } from '@/data/orders';
import { useCart } from '@/hooks/useCart';
import { useOrders } from '@/hooks/useOrders';
import { useFutonModels } from '@/hooks/useFutonModels';
import { formatPrice } from '@/utils';

interface Props {
  orderId?: string;
  orders?: Order[];
  onBack?: () => void;
  onReorderSuccess?: () => void;
  testID?: string;
  route?: { params?: { orderId?: string } };
}

export function OrderDetailScreen({
  orderId: orderIdProp,
  orders: ordersProp,
  onBack,
  onReorderSuccess,
  testID,
  route,
}: Props) {
  const orderId = orderIdProp ?? route?.params?.orderId ?? '';
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const { addItem } = useCart();
  const { getOrder, orders: hookOrders } = useOrders();
  const { getModel, getFabric } = useFutonModels();

  const order = ordersProp
    ? ordersProp.find((o) => o.id === orderId)
    : getOrder(orderId);

  const formatDate = useCallback((iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const handleTrackingPress = useCallback(() => {
    if (order?.tracking?.url) {
      Linking.openURL(order.tracking.url);
    }
  }, [order]);

  const handleReorder = useCallback(() => {
    if (!order) return;
    let added = 0;
    for (const item of order.items) {
      const model = getModel(item.modelId);
      const fabric = getFabric(item.fabricId);
      if (model && fabric) {
        addItem(model, fabric, item.quantity);
        added++;
      }
    }
    if (added > 0 && Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onReorderSuccess?.();
  }, [order, addItem, onReorderSuccess, getModel, getFabric]);

  if (!order) {
    return (
      <View
        style={[styles.root, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'order-detail-screen'}
      >
        <Text style={[styles.notFound, { color: colors.espressoLight }]} testID="order-not-found">
          Order not found
        </Text>
      </View>
    );
  }

  const statusConfig = ORDER_STATUS_CONFIG[order.status];
  const statusColor = colors[statusConfig.colorToken];

  return (
    <View
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'order-detail-screen'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            testID="order-detail-back"
            accessibilityLabel="Go back to orders"
            accessibilityRole="button"
          >
            <Text style={[styles.backText, { color: colors.espresso }]}>{'‹'}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerInfo}>
          <Text
            style={[styles.headerTitle, { color: colors.espresso }]}
            accessibilityRole="header"
            testID="order-detail-header"
          >
            {order.orderNumber}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + '20', borderRadius: borderRadius.sm },
            ]}
            testID="order-detail-status"
          >
            <Text style={[styles.statusText, { color: statusColor }]}>{statusConfig.label}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Order date */}
        <Text
          style={[styles.dateText, { color: colors.espressoLight, paddingHorizontal: spacing.lg }]}
          testID="order-detail-date"
        >
          Placed {formatDate(order.createdAt)}
        </Text>

        {/* Tracking */}
        {order.tracking && (
          <View
            style={[
              styles.trackingCard,
              {
                backgroundColor: colors.mountainBlueLight,
                borderRadius: borderRadius.md,
                marginHorizontal: spacing.lg,
              },
            ]}
            testID="order-tracking-card"
          >
            <Text style={[styles.trackingLabel, { color: colors.mountainBlueDark }]}>
              {order.tracking.carrier} Tracking
            </Text>
            <TouchableOpacity
              onPress={handleTrackingPress}
              testID="tracking-link"
              accessibilityLabel={`Track package with ${order.tracking.carrier}, tracking number ${order.tracking.trackingNumber}`}
              accessibilityRole="link"
            >
              <Text style={[styles.trackingNumber, { color: colors.mountainBlue }]}>
                {order.tracking.trackingNumber}
              </Text>
            </TouchableOpacity>
            {order.tracking.estimatedDelivery && (
              <Text
                style={[styles.trackingEta, { color: colors.espressoLight }]}
                testID="tracking-eta"
              >
                Est. delivery: {formatDate(order.tracking.estimatedDelivery)}
              </Text>
            )}
          </View>
        )}

        {/* Line items */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.espresso }]}>Items</Text>
          {order.items.map((item) => (
            <View
              key={item.id}
              style={[
                styles.lineItem,
                {
                  backgroundColor: colors.sandLight,
                  borderRadius: borderRadius.card,
                },
                shadows.card,
              ]}
              testID={`order-line-item-${item.id}`}
            >
              <View style={styles.lineItemTop}>
                <View style={[styles.fabricDot, { backgroundColor: item.fabricColor }]} />
                <View style={styles.lineItemInfo}>
                  <Text style={[styles.lineItemName, { color: colors.espresso }]}>
                    {item.modelName}
                  </Text>
                  <Text style={[styles.lineItemFabric, { color: colors.espressoLight }]}>
                    {item.fabricName}
                  </Text>
                </View>
              </View>
              <View style={styles.lineItemBottom}>
                <Text style={[styles.lineItemQty, { color: colors.espressoLight }]}>
                  Qty: {item.quantity}
                </Text>
                <Text style={[styles.lineItemPrice, { color: colors.espresso }]}>
                  {formatPrice(item.lineTotal)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View
          style={[
            styles.totalsCard,
            {
              backgroundColor: colors.sandLight,
              borderRadius: borderRadius.card,
              marginHorizontal: spacing.lg,
            },
            shadows.card,
          ]}
          testID="order-detail-totals"
        >
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.espressoLight }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: colors.espresso }]}>
              {formatPrice(order.subtotal)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.espressoLight }]}>Shipping</Text>
            <Text
              style={[
                styles.totalValue,
                { color: order.shipping === 0 ? colors.success : colors.espresso },
              ]}
            >
              {order.shipping === 0 ? 'FREE' : formatPrice(order.shipping)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.espressoLight }]}>Tax</Text>
            <Text style={[styles.totalValue, { color: colors.espresso }]}>
              {formatPrice(order.tax)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.sandDark }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.grandLabel, { color: colors.espresso }]}>Total</Text>
            <Text
              style={[styles.grandValue, { color: colors.espresso }]}
              testID="order-detail-total"
            >
              {formatPrice(order.total)}
            </Text>
          </View>
        </View>

        {/* Shipping address */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.espresso }]}>Shipping Address</Text>
          <View
            style={[
              styles.addressCard,
              {
                backgroundColor: colors.sandLight,
                borderRadius: borderRadius.card,
              },
              shadows.card,
            ]}
            testID="order-shipping-address"
          >
            <Text style={[styles.addressName, { color: colors.espresso }]}>
              {order.shippingAddress.name}
            </Text>
            <Text style={[styles.addressLine, { color: colors.espressoLight }]}>
              {order.shippingAddress.street}
            </Text>
            <Text style={[styles.addressLine, { color: colors.espressoLight }]}>
              {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.zip}
            </Text>
          </View>
        </View>

        {/* Payment */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.espresso }]}>Payment</Text>
          <Text
            style={[styles.paymentText, { color: colors.espressoLight }]}
            testID="order-payment-method"
          >
            {order.paymentMethod}
          </Text>
        </View>

        {/* Re-order button */}
        {order.status !== 'cancelled' && (
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}>
            <TouchableOpacity
              style={[
                styles.reorderButton,
                {
                  backgroundColor: colors.mountainBlue,
                  borderRadius: borderRadius.button,
                },
              ]}
              onPress={handleReorder}
              testID="reorder-button"
              accessibilityLabel="Re-order these items"
              accessibilityRole="button"
            >
              <Text style={styles.reorderText}>Re-order</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 12,
  },
  backText: {
    fontSize: 28,
    fontWeight: '300',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    gap: 20,
  },
  dateText: {
    fontSize: 14,
  },
  notFound: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  // Tracking
  trackingCard: {
    padding: 16,
  },
  trackingLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  trackingNumber: {
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  trackingEta: {
    fontSize: 13,
    marginTop: 6,
  },
  // Line items
  section: {
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  lineItem: {
    padding: 14,
    marginBottom: 8,
  },
  lineItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fabricDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  lineItemInfo: {
    flex: 1,
  },
  lineItemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  lineItemFabric: {
    fontSize: 13,
    marginTop: 2,
  },
  lineItemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  lineItemQty: {
    fontSize: 13,
  },
  lineItemPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Totals
  totalsCard: {
    padding: 20,
  },
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
  divider: {
    height: 1,
    marginVertical: 8,
  },
  grandLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  grandValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  // Address
  addressCard: {
    padding: 14,
  },
  addressName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Payment
  paymentText: {
    fontSize: 15,
  },
  // Re-order
  reorderButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  reorderText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
