import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/utils';

const SHIPPING_THRESHOLD = 499;
const SHIPPING_COST = 49;
const TAX_RATE = 0.07;

type PaymentMethod = 'apple-pay' | 'google-pay' | 'affirm' | 'klarna' | 'card';

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
  onPlaceOrder?: (method: PaymentMethod) => void;
  onBack?: () => void;
  testID?: string;
}

export function CheckoutScreen({ onPlaceOrder, onBack, testID }: Props) {
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();
  const { items, subtotal } = useCart();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + shipping + tax;

  const handleSelectMethod = useCallback((method: PaymentMethod) => {
    setSelectedMethod(method);
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  }, []);

  const handlePlaceOrder = useCallback(() => {
    if (!selectedMethod) return;
    onPlaceOrder?.(selectedMethod);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [selectedMethod, onPlaceOrder]);

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
            testID="checkout-back-button"
            accessibilityLabel="Go back to cart"
            accessibilityRole="button"
          >
            <Text style={[styles.backText, { color: colors.espresso }]}>{'‹'}</Text>
          </TouchableOpacity>
        )}
        <Text
          style={[
            styles.headerTitle,
            { color: colors.espresso, fontFamily: typography.headingFamily },
          ]}
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
      >
        {/* Order items summary */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.espresso, fontFamily: typography.bodyFamilySemiBold },
            ]}
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
              {formatPrice(subtotal)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.espressoLight }]}>Shipping</Text>
            <Text
              style={[
                styles.totalValue,
                { color: shipping === 0 ? colors.success : colors.espresso },
              ]}
            >
              {shipping === 0 ? 'FREE' : formatPrice(shipping)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.espressoLight }]}>Tax</Text>
            <Text style={[styles.totalValue, { color: colors.espresso }]}>{formatPrice(tax)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.sandDark }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.grandTotalLabel, { color: colors.espresso }]}>Total</Text>
            <Text
              style={[
                styles.grandTotalValue,
                { color: colors.espresso, fontFamily: typography.headingFamily },
              ]}
              testID="checkout-total"
            >
              {formatPrice(total)}
            </Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.espresso, fontFamily: typography.bodyFamilySemiBold },
            ]}
          >
            Payment Method
          </Text>
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
            <Text style={[styles.bnplDetail, { color: colors.mountainBlueDark }]}>
              4 payments of {formatPrice(total / 4)}
            </Text>
            <Text style={[styles.bnplNote, { color: colors.espressoLight }]}>
              No interest. No fees if paid on time.
            </Text>
          </View>
        )}

        {/* Place Order */}
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}>
          <TouchableOpacity
            style={[
              styles.placeOrderButton,
              {
                backgroundColor: selectedMethod ? colors.sunsetCoral : colors.muted,
                borderRadius: borderRadius.button,
              },
              selectedMethod ? shadows.button : undefined,
            ]}
            onPress={handlePlaceOrder}
            disabled={!selectedMethod}
            testID="place-order-button"
            accessibilityLabel={
              selectedMethod
                ? `Place order for ${formatPrice(total)}`
                : 'Select a payment method to continue'
            }
            accessibilityRole="button"
            accessibilityState={{ disabled: !selectedMethod }}
          >
            <Text style={[styles.placeOrderText, { fontFamily: typography.bodyFamilyBold }]}>
              {selectedMethod ? `Place Order — ${formatPrice(total)}` : 'Select Payment Method'}
            </Text>
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
  // Place order
  placeOrderButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
