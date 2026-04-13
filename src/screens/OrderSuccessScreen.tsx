/**
 * @module OrderSuccessScreen
 *
 * Lightweight post-purchase celebration screen. Shown after the user taps
 * "View Order Confirmation" on PaymentConfirmationScreen. Displays a success
 * state with order number and CTAs to continue shopping or view orders.
 */
import React, { useEffect } from 'react';
import { Platform, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';

interface Props {
  orderNumber: string;
  onContinueShopping: () => void;
  onViewOrders?: () => void;
  testID?: string;
}

/** Success screen shown after payment is fully confirmed. */
export function OrderSuccessScreen({
  orderNumber,
  onContinueShopping,
  onViewOrders,
  testID,
}: Props) {
  const { colors, spacing, borderRadius } = useTheme();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, []);

  return (
    <View
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'order-success-screen'}
    >
      {/* Success icon */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: colors.success + '20', borderRadius: 999 },
        ]}
      >
        <Text
          style={[styles.checkmark, { color: colors.success }]}
          accessibilityLabel="Order confirmed"
          accessibilityRole="text"
        >
          ✓
        </Text>
      </View>

      {/* Heading */}
      <Text style={[styles.heading, { color: colors.espresso }]}>Order Confirmed!</Text>
      <Text style={[styles.subheading, { color: colors.espressoLight }]}>
        Thank you for your purchase.
      </Text>

      {/* Order number */}
      <View
        style={[
          styles.orderBadge,
          { backgroundColor: colors.white, borderRadius: borderRadius.card },
        ]}
      >
        <Text style={[styles.orderLabel, { color: colors.espressoLight }]}>Order Number</Text>
        <Text style={[styles.orderNumber, { color: colors.espresso }]}>{orderNumber}</Text>
      </View>

      {/* CTAs */}
      <View style={styles.actions}>
        <TouchableOpacity
          testID="continue-shopping-btn"
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.sunsetCoral, borderRadius: borderRadius.button },
          ]}
          onPress={onContinueShopping}
          accessibilityRole="button"
          accessibilityLabel="Continue shopping"
        >
          <Text style={styles.primaryBtnText}>Continue Shopping</Text>
        </TouchableOpacity>

        {onViewOrders && (
          <TouchableOpacity
            testID="view-orders-btn"
            style={[
              styles.secondaryBtn,
              { borderColor: colors.sunsetCoral, borderRadius: borderRadius.button },
            ]}
            onPress={onViewOrders}
            accessibilityRole="button"
            accessibilityLabel="View your orders"
          >
            <Text style={[styles.secondaryBtnText, { color: colors.sunsetCoral }]}>
              View My Orders
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  checkmark: {
    fontSize: 40,
    fontWeight: '700',
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  subheading: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: -8,
  },
  orderBadge: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 4,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  orderLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
