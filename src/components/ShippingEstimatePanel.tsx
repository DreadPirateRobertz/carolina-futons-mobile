/**
 * @module ShippingEstimatePanel
 *
 * PDP shipping estimate section (cm-9yn).
 * Renders a zip input; once a valid zip is entered it calls the
 * getShippingEstimate backend webmethod and shows the parcel or freight rate.
 * Displays an estimate disclaimer when the API marks the quote as provisional.
 */

import React, { memo } from 'react';
import { StyleSheet, View, Text, TextInput, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme';
import {
  useProductShippingEstimate,
  type ProductDimensions,
} from '@/hooks/useProductShippingEstimate';

interface Props {
  productId: string;
  dimensions: ProductDimensions;
  /** Cart item count forwarded to hook for bundle incentive upsell (cm-bundle-incentive) */
  itemCount?: number;
  testID?: string;
}

export const ShippingEstimatePanel = memo(function ShippingEstimatePanel({
  productId,
  dimensions,
  itemCount,
  testID = 'shipping-panel',
}: Props) {
  const { colors, typography, borderRadius } = useTheme();
  const { zip, setZip, rate, isLoading, error } = useProductShippingEstimate({
    productId,
    dimensions,
    itemCount,
  });

  const hasZip = zip.length > 0;

  return (
    <View testID={testID} style={styles.container}>
      {/* Section label */}
      <Text
        style={[styles.label, { color: colors.espresso, fontFamily: typography.bodyFamilyBold }]}
      >
        Shipping Estimate
      </Text>

      {/* Zip input */}
      <TextInput
        testID="shipping-zip-input"
        style={[
          styles.zipInput,
          {
            color: colors.espresso,
            borderColor: colors.espressoLight,
            borderRadius: borderRadius.sm,
            fontFamily: typography.bodyFamily,
          },
        ]}
        placeholder="Enter ZIP code"
        placeholderTextColor={colors.espressoLight}
        keyboardType="numeric"
        maxLength={5}
        value={zip}
        onChangeText={setZip}
        accessibilityLabel="ZIP code for shipping estimate"
        accessibilityHint="Enter your 5-digit ZIP code to see shipping rates"
      />

      {/* No-zip prompt */}
      {!hasZip && (
        <Text style={[styles.prompt, { color: colors.espressoLight }]}>
          Enter zip for shipping estimate
        </Text>
      )}

      {/* Loading */}
      {hasZip && isLoading && (
        <ActivityIndicator
          testID="shipping-rate-loading"
          size="small"
          color={colors.mountainBlue}
          style={styles.loader}
          accessibilityLabel="Loading shipping rate"
        />
      )}

      {/* Error */}
      {hasZip && !isLoading && error && (
        <Text
          testID="shipping-rate-error"
          style={[styles.errorText, { color: colors.error }]}
          accessibilityLiveRegion="polite"
        >
          Unable to estimate shipping. Please verify your ZIP code.
        </Text>
      )}

      {/* Rate result */}
      {hasZip && !isLoading && !error && rate && (
        <View
          testID="shipping-rate-result"
          style={styles.rateRow}
          accessibilityLabel={`${rate.carrier} — $${rate.amount}${rate.isFreight ? ' Freight (LTL)' : ''}`}
        >
          <Text
            style={[
              styles.rateText,
              { color: colors.espresso, fontFamily: typography.bodyFamilyBold },
            ]}
          >
            ${rate.amount}
          </Text>
          <Text style={[styles.carrierText, { color: colors.espresso }]}>
            {' · '}
            {rate.carrier}
            {rate.isFreight ? ' · Freight (LTL)' : ''}
          </Text>
        </View>
      )}

      {/* isEstimate disclaimer */}
      {hasZip && !isLoading && !error && rate?.isEstimate && (
        <Text
          testID="shipping-estimate-disclaimer"
          style={[styles.disclaimer, { color: colors.espressoLight }]}
        >
          *Estimated rate — final shipping confirmed at checkout.
        </Text>
      )}

      {/* Bundle incentive upsell — cm-bundle-incentive */}
      {hasZip && !isLoading && !error && rate?.upsellMessage ? (
        <Text
          testID="shipping-upsell-message"
          style={[styles.upsell, { color: colors.mountainBlue }]}
        >
          {rate.upsellMessage}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 4,
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  zipInput: {
    height: 40,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 15,
  },
  prompt: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  loader: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  rateText: {
    fontSize: 15,
  },
  carrierText: {
    fontSize: 14,
  },
  disclaimer: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 13,
  },
  upsell: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
