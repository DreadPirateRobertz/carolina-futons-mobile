/**
 * @module CheckoutScreen
 *
 * Final step before purchase. Displays the order summary, totals
 * (with free-shipping threshold logic), and a payment method picker
 * that includes Apple Pay / Google Pay, credit card, and BNPL
 * (Buy Now Pay Later) options via Affirm and Klarna.
 *
 * Haptic feedback reinforces selection and success states on native.
 */
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { typography } from '@/theme/tokens';
import { useCart } from '@/hooks/useCart';
import { usePayment } from '@/hooks/usePayment';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { formatPrice } from '@/utils';
import type { PaymentMethod } from '@/services/payment';
import type { OrderConfirmation } from '@/services/payment';
import { events } from '@/services/analytics';

const SHIPPING_THRESHOLD = 499;

interface PaymentOption {
  id: PaymentMethod;
  label: string;
  icon: string;
  description: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  ...(Platform.OS === 'ios'
    ? [
        {
          id: 'apple-pay' as PaymentMethod,
          label: 'Apple Pay',
          icon: '',
          description: 'Pay with Face ID',
        },
      ]
    : [
        {
          id: 'google-pay' as PaymentMethod,
          label: 'Google Pay',
          icon: 'G',
          description: 'Pay with Google',
        },
      ]),
  {
    id: 'affirm',
    label: 'Affirm',
    icon: 'A',
    description: 'Pay over time, 0% APR available',
  },
  {
    id: 'klarna',
    label: 'Klarna',
    icon: 'K',
    description: '4 interest-free payments',
  },
  {
    id: 'card',
    label: 'Credit / Debit Card',
    icon: '',
    description: 'Visa, Mastercard, Amex',
  },
];

interface Props {
  onOrderComplete?: (order: OrderConfirmation) => void;
  onBack?: () => void;
  testID?: string;
}

/** Checkout flow screen with payment selection, order totals, and BNPL breakdown. */
export function CheckoutScreen({ onOrderComplete, onBack, testID }: Props) {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const { items, subtotal } = useCart();
  const { status, error, totals, processPayment, resetPayment } = usePayment();
  const { isEnabled: biometricEnabled, promptBiometric } = useBiometricAuth();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [checkoutTracked, setCheckoutTracked] = useState(false);

  const isProcessing = status === 'processing';

  if (!checkoutTracked && items.length > 0) {
    events.beginCheckout(items.length, totals.total);
    setCheckoutTracked(true);
  }

  const handleSelectMethod = useCallback(
    (method: PaymentMethod) => {
      if (isProcessing) return;
      setSelectedMethod(method);
      if (error) resetPayment();
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    },
    [isProcessing, error, resetPayment],
  );

  const handlePlaceOrder = useCallback(async () => {
    if (!selectedMethod || isProcessing) return;

    if (biometricEnabled) {
      const passed = await promptBiometric('Confirm purchase with biometrics');
      if (!passed) return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const order = await processPayment(selectedMethod);

    if (order) {
      events.purchase(order.orderId, totals.total, items.length);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onOrderComplete?.(order);
    }
  }, [selectedMethod, isProcessing, biometricEnabled, promptBiometric, processPayment, onOrderComplete, totals.total, items.length]);

  const isBNPL = selectedMethod === 'affirm' || selectedMethod === 'klarna';

  return (
    <View
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'checkout-screen'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            disabled={isProcessing}
            testID="checkout-back-button"
            accessibilityLabel="Go back to cart"
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.backText,
                { color: isProcessing ? colors.muted : colors.espresso },
              ]}
            >
              {'‹'}
            </Text>
          </TouchableOpacity>
        )}
        <Text
          style={[styles.headerTitle, { color: colors.espresso, fontFamily: typography.headingFamily }]}
          accessibilityRole="header"
          testID="checkout-header"
        >
          Checkout
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isProcessing}
      >
        {/* Order items summary */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text
            style={[styles.sectionTitle, { color: colors.espresso, fontFamily: typography.bodyFamilySemiBold }]}
            testID="checkout-items-section-title"
          >
            Items ({items.length})
          </Text>
          {items.map((item) => (
            <View key={item.id} style={styles.itemRow} testID={`checkout-item-${item.id}`}>
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
          testID="checkout-totals"
        >
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.espressoLight }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: colors.espresso }]}>
              {formatPrice(totals.subtotal)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.espressoLight }]}>Shipping</Text>
            <Text
              style={[
                styles.totalValue,
                { color: totals.shipping === 0 ? colors.success : colors.espresso },
              ]}
            >
              {totals.shipping === 0 ? 'FREE' : formatPrice(totals.shipping)}
            </Text>
          </View>
          {subtotal < SHIPPING_THRESHOLD && subtotal > 0 && (
            <Text style={[styles.shippingNote, { color: colors.mountainBlue }]}>
              Free shipping on orders over {formatPrice(SHIPPING_THRESHOLD)}
            </Text>
          )}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.espressoLight }]}>Tax</Text>
            <Text style={[styles.totalValue, { color: colors.espresso }]}>
              {formatPrice(totals.tax)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.sandDark }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.grandTotalLabel, { color: colors.espresso }]}>Total</Text>
            <Text
              style={[styles.grandTotalValue, { color: colors.espresso, fontFamily: typography.headingFamily }]}
              testID="checkout-total"
            >
              {formatPrice(totals.total)}
            </Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.espresso }]}>Payment Method</Text>
          {PAYMENT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.paymentOption,
                {
                  backgroundColor: colors.sandLight,
                  borderRadius: borderRadius.md,
                  borderColor: selectedMethod === option.id ? colors.mountainBlue : colors.sandDark,
                },
              ]}
              onPress={() => handleSelectMethod(option.id)}
              disabled={isProcessing}
              testID={`payment-${option.id}`}
              accessibilityLabel={`${option.label}: ${option.description}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedMethod === option.id }}
            >
              <View
                style={[
                  styles.radioOuter,
                  {
                    borderColor: selectedMethod === option.id ? colors.mountainBlue : colors.muted,
                  },
                ]}
              >
                {selectedMethod === option.id && (
                  <View style={[styles.radioInner, { backgroundColor: colors.mountainBlue }]} />
                )}
              </View>
              <View style={styles.paymentInfo}>
                <Text style={[styles.paymentLabel, { color: colors.espresso }]}>
                  {option.icon ? `${option.icon} ` : ''}
                  {option.label}
                </Text>
                <Text style={[styles.paymentDesc, { color: colors.espressoLight }]}>
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* BNPL breakdown */}
        {isBNPL && (
          <View
            style={[
              styles.bnplBreakdown,
              {
                backgroundColor: colors.mountainBlueLight,
                borderRadius: borderRadius.md,
                marginHorizontal: spacing.lg,
              },
            ]}
            testID="bnpl-breakdown"
          >
            <Text style={[styles.bnplTitle, { color: colors.mountainBlueDark }]}>
              {selectedMethod === 'affirm' ? 'Affirm' : 'Klarna'} Payment Plan
            </Text>
            {selectedMethod === 'klarna' ? (
              <>
                <Text style={[styles.bnplDetail, { color: colors.mountainBlueDark }]}>
                  4 payments of {formatPrice(totals.total / 4)}
                </Text>
                <Text style={[styles.bnplNote, { color: colors.espressoLight }]}>
                  No interest. No fees if paid on time.
                </Text>
              </>
            ) : (
              <Text style={[styles.bnplNote, { color: colors.espressoLight }]}>
                Flexible monthly payments. 0% APR available.
              </Text>
            )}
          </View>
        )}

        {/* Error message */}
        {error && (
          <View
            style={[
              styles.errorCard,
              {
                borderRadius: borderRadius.md,
                marginHorizontal: spacing.lg,
              },
            ]}
            testID="payment-error"
            accessibilityRole="alert"
          >
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Place Order */}
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}>
          <TouchableOpacity
            style={[
              styles.placeOrderButton,
              {
                backgroundColor:
                  selectedMethod && !isProcessing ? colors.sunsetCoral : colors.muted,
                borderRadius: borderRadius.button,
              },
              selectedMethod && !isProcessing ? shadows.button : undefined,
            ]}
            onPress={handlePlaceOrder}
            disabled={!selectedMethod || isProcessing}
            testID="place-order-button"
            accessibilityLabel={
              isProcessing
                ? 'Processing payment'
                : selectedMethod
                  ? `Place order for ${formatPrice(totals.total)}`
                  : 'Select a payment method to continue'
            }
            accessibilityRole="button"
            accessibilityState={{ disabled: !selectedMethod || isProcessing }}
          >
            {isProcessing ? (
              <View style={styles.processingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={[styles.placeOrderText, { marginLeft: 10 }]}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.placeOrderText}>
                {selectedMethod
                  ? `Place Order — ${formatPrice(totals.total)}`
                  : 'Select Payment Method'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    gap: 20,
  },
  section: {
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  // Items
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
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
  shippingNote: {
    fontSize: 12,
    marginBottom: 8,
    marginTop: -4,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  // Payment
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    marginBottom: 10,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  paymentDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  // BNPL
  bnplBreakdown: {
    padding: 16,
    alignItems: 'center',
  },
  bnplTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  bnplDetail: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  bnplNote: {
    fontSize: 12,
  },
  // Error
  errorCard: {
    padding: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Place order
  placeOrderButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
