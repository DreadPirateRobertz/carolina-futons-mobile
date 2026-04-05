/**
 * @module BundleSuggestion
 *
 * Displays a bundle suggestion card on the Product Detail Screen and Cart Screen.
 * Shows the bundle name, included products, savings percentage and dollar amount,
 * the coupon code, and an "Add Bundle to Cart" CTA.
 *
 * Returns null when no bundle is available for the given product (no match,
 * error, or unauthenticated). Loading state shows a skeleton placeholder.
 *
 * deacon-y8lf / cm-bun
 */

import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme';
import { useBundleSuggestion } from '@/hooks/useBundleSuggestion';
import { formatPrice } from '@/utils';

interface Props {
  productId: string;
  testID?: string;
}

export const BundleSuggestion = memo(function BundleSuggestion({ productId, testID }: Props) {
  const rootTestID = testID ?? 'bundle-suggestion';
  const {
    bundle,
    bundleProducts,
    pricing,
    isLoading,
    error,
    addBundleToCart,
    isAddingToCart,
    addSuccess,
  } = useBundleSuggestion(productId);

  if (error) return null;

  if (isLoading) {
    return (
      <View style={styles.container} testID={rootTestID}>
        <ActivityIndicator testID={`${rootTestID}-loading`} />
      </View>
    );
  }

  if (!bundle || !pricing) return null;

  return (
    <View style={styles.container} testID={rootTestID}>
      <BundleSuggestionInner
        bundle={bundle}
        bundleProducts={bundleProducts}
        pricing={pricing}
        addBundleToCart={addBundleToCart}
        isAddingToCart={isAddingToCart}
        addSuccess={addSuccess}
        rootTestID={rootTestID}
      />
    </View>
  );
});

interface InnerProps {
  bundle: NonNullable<ReturnType<typeof useBundleSuggestion>['bundle']>;
  bundleProducts: ReturnType<typeof useBundleSuggestion>['bundleProducts'];
  pricing: NonNullable<ReturnType<typeof useBundleSuggestion>['pricing']>;
  addBundleToCart: () => Promise<void>;
  isAddingToCart: boolean;
  addSuccess: boolean;
  rootTestID: string;
}

function BundleSuggestionInner({
  bundle,
  bundleProducts,
  pricing,
  addBundleToCart,
  isAddingToCart,
  addSuccess,
  rootTestID,
}: InnerProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();

  return (
    <>
      <Text
        style={[styles.title, { color: colors.espresso, fontFamily: typography.bodyFamilyBold }]}
        accessibilityRole="header"
      >
        {bundle.name}
      </Text>

      <View style={styles.productList}>
        {bundleProducts.map((product) => (
          <Text key={product.id} style={[styles.productName, { color: colors.espresso }]}>
            {product.name}
          </Text>
        ))}
      </View>

      <View
        style={[
          styles.savingsRow,
          { backgroundColor: colors.successLight ?? '#E8F5E9', borderRadius: borderRadius.sm },
        ]}
        testID={`${rootTestID}-savings`}
      >
        <Text style={[styles.savingsText, { color: colors.success ?? '#2E7D32' }]}>
          {`Save ${pricing.savingsPercent}% — `}
          <Text style={styles.savingsAmount}>{formatPrice(pricing.savings)}</Text>
          {' off'}
        </Text>
      </View>

      <View style={styles.pricingRow}>
        <Text
          style={[
            styles.bundlePrice,
            { color: colors.espresso, fontFamily: typography.bodyFamilyBold },
          ]}
        >
          {formatPrice(pricing.bundlePrice)}
        </Text>
        <Text style={[styles.originalPrice, { color: colors.textMuted ?? colors.espresso }]}>
          {formatPrice(pricing.originalTotal)}
        </Text>
      </View>

      <View style={styles.couponRow}>
        <Text style={[styles.couponLabel, { color: colors.espresso }]}>{'Coupon: '}</Text>
        <Text
          style={[styles.couponCode, { color: colors.mountainBlue ?? colors.espresso }]}
          testID={`${rootTestID}-coupon`}
        >
          {pricing.couponCode}
        </Text>
      </View>

      {addSuccess ? (
        <View testID={`${rootTestID}-success`}>
          <Text style={[styles.successText, { color: colors.success ?? '#2E7D32' }]}>
            Bundle added to cart!
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.cta,
            {
              backgroundColor: isAddingToCart
                ? (colors.textMuted ?? '#999')
                : (colors.mountainBlue ?? colors.espresso),
              borderRadius: borderRadius.sm,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
            },
          ]}
          onPress={addBundleToCart}
          disabled={isAddingToCart}
          accessibilityRole="button"
          accessibilityLabel={`Add ${bundle.name} bundle to cart`}
          accessibilityState={{ disabled: isAddingToCart }}
          testID={`${rootTestID}-cta`}
        >
          {isAddingToCart ? (
            <ActivityIndicator color="#FFFFFF" testID={`${rootTestID}-cta-loading`} />
          ) : (
            <Text style={styles.ctaText}>Add Bundle to Cart</Text>
          )}
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  productList: {
    marginBottom: 10,
    gap: 2,
  },
  productName: {
    fontSize: 14,
  },
  savingsRow: {
    padding: 8,
    marginBottom: 8,
  },
  savingsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  savingsAmount: {
    fontWeight: '700',
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  bundlePrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  couponLabel: {
    fontSize: 13,
  },
  couponCode: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 10,
  },
});
