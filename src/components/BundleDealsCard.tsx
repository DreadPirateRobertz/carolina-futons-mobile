/**
 * @module BundleDealsCard
 *
 * Displays a single bundle promotion from the shared Wix BundleDeals
 * CMS collection (cm-6i5). Shows:
 *  - Bundle name
 *  - Included products (by catalog name)
 *  - Fixed bundle price
 *  - Discount code with a copy-to-clipboard button
 *
 * Used on ShopScreen (promotional rail) and ProductDetailScreen (filtered
 * to bundles that include the current product's SKU).
 */

import React from 'react';
import { Clipboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme';
import { formatPrice } from '@/utils';
import type { BundleDeal } from '@/hooks/useBundleDeals';

interface Props {
  bundle: BundleDeal;
  testID?: string;
}

export function BundleDealsCard({ bundle, testID }: Props) {
  const rootTestID = testID ?? 'bundle-deals-card';
  const { colors, spacing, borderRadius, typography } = useTheme();

  return (
    <View
      testID={rootTestID}
      style={[
        styles.container,
        {
          backgroundColor: colors.offWhite,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
        },
      ]}
    >
      {/* Bundle name */}
      <Text
        style={[styles.name, { color: colors.espresso, fontFamily: typography.bodyFamilyBold }]}
        accessibilityRole="header"
      >
        {bundle.name}
      </Text>

      {/* Included products */}
      {bundle.products.length > 0 && (
        <View style={styles.productList}>
          {bundle.products.map((product) => (
            <Text
              key={product.id}
              style={[
                styles.productName,
                { color: colors.espressoLight, fontFamily: typography.bodyFamily },
              ]}
            >
              {product.name}
            </Text>
          ))}
        </View>
      )}

      {/* Price */}
      <Text
        testID={`${rootTestID === 'bundle-deals-card' ? 'bundle-deals-price' : `${rootTestID}-price`}`}
        style={[styles.price, { color: colors.espresso, fontFamily: typography.headingFamily }]}
      >
        {formatPrice(bundle.price)}
      </Text>

      {/* Discount code row */}
      <View style={styles.codeRow}>
        <Text style={[styles.codeLabel, { color: colors.espressoLight }]}>Code: </Text>
        <Text
          style={[
            styles.code,
            { color: colors.mountainBlue, fontFamily: typography.bodyFamilyBold },
          ]}
        >
          {bundle.discountCode}
        </Text>
        <TouchableOpacity
          testID="bundle-deals-copy-code"
          onPress={() => Clipboard.setString(bundle.discountCode)}
          accessibilityLabel={`Copy discount code ${bundle.discountCode}`}
          accessibilityRole="button"
          style={[
            styles.copyButton,
            {
              backgroundColor: colors.sandDark,
              borderRadius: borderRadius.sm,
              marginLeft: spacing.sm,
            },
          ]}
        >
          <Text style={[styles.copyText, { color: colors.espresso }]}>Copy</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  productList: {
    marginBottom: 8,
    gap: 2,
  },
  productName: {
    fontSize: 13,
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 13,
  },
  code: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  copyButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  copyText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
