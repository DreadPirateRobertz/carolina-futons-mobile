/**
 * @module PaymentConfirmationScreen
 *
 * Shown after Stripe payment intent is confirmed. Displays the full charge
 * breakdown (subtotal, shipping, tax, grand total), payment method, and
 * estimated delivery. Handles loading (Stripe confirming), success (CTA to
 * continue), and error states (retry button).
 */
import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/theme';
import { formatPrice } from '@/utils';
import type { OrderConfirmation } from '@/services/payment';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Credit / Debit Card',
  'apple-pay': 'Apple Pay',
  'google-pay': 'Google Pay',
  affirm: 'Affirm',
  klarna: 'Klarna',
};

interface Props {
  order: OrderConfirmation;
  onSuccess: () => void;
  onRetry?: () => void;
  error?: string | null;
  isLoading?: boolean;
  testID?: string;
}

/** Post-payment charge confirmation screen with order summary and totals. */
export function PaymentConfirmationScreen({
  order,
  onSuccess,
  onRetry,
  error,
  isLoading,
  testID,
}: Props) {
  const { colors, spacing, borderRadius, shadows } = useTheme();

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      contentContainerStyle={styles.content}
      testID={testID ?? 'payment-confirmation-screen'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.espresso }]}>Payment Confirmation</Text>
        <Text style={[styles.orderNumber, { color: colors.espressoLight }]}>
          Order <Text testID="payment-order-number">{order.orderNumber}</Text>
        </Text>
      </View>

      {/* Order items */}
      <View
        style={[
          styles.card,
          shadows.card,
          { backgroundColor: colors.white, borderRadius: borderRadius.card },
        ]}
      >
        <Text style={[styles.sectionLabel, { color: colors.espresso }]}>Items</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={[styles.itemName, { color: colors.espresso }]} numberOfLines={2}>
              {item.model.name}
              {item.fabric ? ` — ${item.fabric.name}` : ''}
              {item.quantity > 1 ? ` ×${item.quantity}` : ''}
            </Text>
            <Text style={[styles.itemPrice, { color: colors.espresso }]}>
              {formatPrice(item.unitPrice * item.quantity)}
            </Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View
        style={[
          styles.card,
          shadows.card,
          { backgroundColor: colors.white, borderRadius: borderRadius.card },
        ]}
      >
        <Text style={[styles.sectionLabel, { color: colors.espresso }]}>Charge Summary</Text>

        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.espressoLight }]}>Subtotal</Text>
          <Text testID="subtotal-value" style={[styles.totalValue, { color: colors.espresso }]}>
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
            {order.totals.shipping === 0 ? 'Free' : formatPrice(order.totals.shipping)}
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.espressoLight }]}>Tax</Text>
          <Text style={[styles.totalValue, { color: colors.espresso }]}>
            {formatPrice(order.totals.tax)}
          </Text>
        </View>

        <View style={[styles.totalRow, styles.grandTotalRow]}>
          <Text style={[styles.grandTotalLabel, { color: colors.espresso }]}>Total Charged</Text>
          <Text style={[styles.grandTotalValue, { color: colors.espresso }]}>
            {formatPrice(order.totals.total)}
          </Text>
        </View>
      </View>

      {/* Payment method + delivery */}
      <View
        style={[
          styles.card,
          shadows.card,
          { backgroundColor: colors.white, borderRadius: borderRadius.card },
        ]}
      >
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.espressoLight }]}>Paid with</Text>
          <Text style={[styles.metaValue, { color: colors.espresso }]}>
            {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.espressoLight }]}>Est. Delivery</Text>
          <Text style={[styles.metaValue, { color: colors.espresso }]}>
            {order.estimatedDelivery}
          </Text>
        </View>
      </View>

      {/* Loading indicator */}
      {isLoading && (
        <ActivityIndicator
          testID="payment-loading-indicator"
          size="large"
          color={colors.mountainBlue}
          style={styles.loader}
        />
      )}

      {/* Error state */}
      {!isLoading && error ? (
        <View
          testID="payment-error-view"
          style={[styles.errorCard, { borderRadius: borderRadius.card }]}
        >
          <Text style={[styles.errorTitle, { color: colors.error }]}>Payment Failed</Text>
          <Text style={[styles.errorMessage, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity
            testID="retry-btn"
            style={[
              styles.retryButton,
              { backgroundColor: colors.sunsetCoral, borderRadius: borderRadius.button },
            ]}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry payment"
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Success CTA */}
      {!isLoading && !error ? (
        <TouchableOpacity
          testID="continue-btn"
          style={[
            styles.continueButton,
            { backgroundColor: colors.sunsetCoral, borderRadius: borderRadius.button },
          ]}
          onPress={onSuccess}
          accessibilityRole="button"
          accessibilityLabel="Continue to order confirmation"
        >
          <Text style={styles.continueButtonText}>View Order Confirmation</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  header: {
    paddingVertical: 8,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  orderNumber: {
    fontSize: 14,
  },
  card: {
    padding: 16,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalRow: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5D9C8',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 13,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 24,
  },
  errorCard: {
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  errorMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 4,
    paddingVertical: 14,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  continueButton: {
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
