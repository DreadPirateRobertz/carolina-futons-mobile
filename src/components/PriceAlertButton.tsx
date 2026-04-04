/**
 * @module PriceAlertButton
 *
 * Subscribe/unsubscribe button for price-drop push notifications on a product.
 * Uses usePriceAlertSubscription to manage the Wix PriceAlerts CMS record.
 *
 * States:
 *  - Unsubscribed: "Alert me when price drops" (bell icon)
 *  - Subscribed:   "Price alert on" (bell-filled, tinted)
 *  - Loading:      spinner, button disabled
 *  - Error:        inline error message below button
 *
 * @bead cm-pda
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme';
import { usePriceAlertSubscription } from '@/hooks/usePriceAlertSubscription';

interface PriceAlertButtonProps {
  productId: string;
  productSlug: string;
  currentPrice: number;
  testID?: string;
}

export function PriceAlertButton({
  productId,
  productSlug,
  currentPrice,
  testID = 'price-alert-button',
}: PriceAlertButtonProps) {
  const { colors, borderRadius: br } = useTheme();
  const { isSubscribed, isLoading, error, subscribe, unsubscribe } = usePriceAlertSubscription(
    productId,
    productSlug,
    currentPrice,
  );

  const handlePress = useCallback(() => {
    if (isLoading) return;
    if (isSubscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  }, [isLoading, isSubscribed, subscribe, unsubscribe]);

  const label = isSubscribed ? 'Price alert on' : 'Alert me when price drops';
  const accessibilityLabel = isSubscribed
    ? 'Remove price drop alert for this product'
    : 'Alert me when this product drops in price';

  return (
    <View>
      <TouchableOpacity
        testID={testID}
        onPress={handlePress}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: isLoading }}
        style={[
          styles.button,
          {
            borderColor: isSubscribed ? colors.mountainBlue : colors.muted,
            borderRadius: br.md,
            backgroundColor: isSubscribed ? colors.mountainBlue + '18' : 'transparent',
          },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator
            testID="price-alert-loading"
            size="small"
            color={colors.mountainBlue}
          />
        ) : (
          <Text
            style={[styles.label, { color: isSubscribed ? colors.mountainBlue : colors.espresso }]}
          >
            {isSubscribed ? '🔔 ' : '🔔 '}
            {label}
          </Text>
        )}
      </TouchableOpacity>

      {error !== null && (
        <Text testID="price-alert-error" style={[styles.error, { color: colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
