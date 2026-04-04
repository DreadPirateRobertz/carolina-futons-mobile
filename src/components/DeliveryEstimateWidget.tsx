/**
 * @module DeliveryEstimateWidget
 *
 * Zip code input with real-time delivery estimate display for the PDP.
 * Consumes godfrey's getDeliveryEstimate webMethod via useDeliveryEstimate.
 * (cm-uyd: Delivery Estimator mobile UI)
 */

import React, { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { useDeliveryEstimate } from '@/hooks/useDeliveryEstimate';
import { DeliveryTierBadge } from './DeliveryTierBadge';
import type { ItemDimensions } from '@/utils/deliveryEstimate';

interface Props {
  /** Wix product IDs to estimate delivery for */
  productIds: string[];
  /** Optional item dimensions for freight tier detection */
  dimensions?: ItemDimensions;
  testID?: string;
}

export function DeliveryEstimateWidget({ productIds, dimensions, testID }: Props) {
  const { colors, typography, borderRadius } = useTheme();
  const [zip, setZip] = useState('');

  const { estimate, isLoading, error } = useDeliveryEstimate(zip, productIds);

  return (
    <View style={styles.container} testID={testID ?? 'delivery-estimate-widget'}>
      <Text
        style={[styles.label, { color: colors.espresso, fontFamily: typography.bodyFamilyBold }]}
      >
        Check delivery to your zip:
      </Text>

      <View
        style={[
          styles.inputRow,
          { borderColor: colors.espressoLight, borderRadius: borderRadius.md },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: colors.espresso,
              fontFamily: typography.bodyFamily,
              backgroundColor: colors.sandLight,
              borderRadius: borderRadius.md,
            },
          ]}
          value={zip}
          onChangeText={setZip}
          placeholder="Enter zip code"
          placeholderTextColor={colors.espressoLight}
          keyboardType="number-pad"
          maxLength={5}
          testID="delivery-estimate-zip-input"
          accessibilityLabel="Enter zip code to check delivery estimate"
          returnKeyType="done"
        />
      </View>

      {isLoading && zip.length === 5 ? (
        <View style={styles.resultRow} testID="delivery-estimate-loading">
          <ActivityIndicator size="small" color={colors.mountainBlue} />
        </View>
      ) : null}

      {!isLoading && estimate && zip.length > 0 ? (
        <View testID="delivery-estimate-result">
          <View style={styles.resultRow}>
            <Text style={[styles.truckIcon]}>🚚</Text>
            <View style={styles.resultText}>
              <Text
                style={[
                  styles.estimateText,
                  { color: colors.espresso, fontFamily: typography.bodyFamilyBold },
                ]}
              >
                {estimate.displayText}
              </Text>
              {estimate.service ? (
                <Text
                  style={[
                    styles.serviceText,
                    { color: colors.espressoLight, fontFamily: typography.bodyFamily },
                  ]}
                >
                  {estimate.service}
                </Text>
              ) : null}
            </View>
          </View>
          <DeliveryTierBadge zip={zip} dimensions={dimensions} />
        </View>
      ) : null}

      {!isLoading && error && zip.length > 0 ? (
        <View style={styles.resultRow} testID="delivery-estimate-error">
          <Text
            style={[
              styles.errorText,
              { color: colors.error ?? colors.sunsetCoral, fontFamily: typography.bodyFamily },
            ]}
          >
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    letterSpacing: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  truckIcon: {
    fontSize: 16,
  },
  resultText: {
    flex: 1,
  },
  estimateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  serviceText: {
    fontSize: 12,
    marginTop: 1,
  },
  errorText: {
    fontSize: 13,
  },
});
