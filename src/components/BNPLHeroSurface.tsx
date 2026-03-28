/**
 * BNPLHeroSurface — Prominent buy-now-pay-later callout for PDP and Cart.
 *
 * Surfaces Affirm/Klarna monthly payment prominently in the price section.
 * Tap opens the BNPLModal payment calculator.
 *
 * Two variants:
 * - `pdp` (default): Full-width card below the price on ProductDetailScreen
 * - `cart`: Compact card below the cart total on CartScreen
 */
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { isFinancingEligible, getFinancingTerms } from '@/utils/financing';
import { formatPrice } from '@/utils';

interface Props {
  price: number;
  variant?: 'pdp' | 'cart';
  onPress?: () => void;
  testID?: string;
}

export function BNPLHeroSurface({ price, variant = 'pdp', onPress, testID = 'bnpl-hero' }: Props) {
  const { colors, borderRadius, spacing } = useTheme();

  if (!isFinancingEligible(price) || !isFinite(price)) return null;

  const terms = getFinancingTerms(price);
  if (terms.length === 0) return null;

  const lowestTerm = terms[terms.length - 1];
  const monthlyDisplay = formatPrice(lowestTerm.monthlyPayment);

  const content = (
    <View
      style={[
        styles.container,
        variant === 'cart' && styles.containerCart,
        {
          backgroundColor: `${colors.mountainBlue}0D`,
          borderColor: `${colors.mountainBlue}40`,
          borderRadius: borderRadius.lg,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.monthlyLabel, { color: colors.mutedBrown }]}>Pay as low as</Text>
        <Text
          testID={`${testID}-monthly`}
          style={[
            styles.monthlyAmount,
            variant === 'cart' && styles.monthlyAmountCart,
            { color: colors.mountainBlue },
          ]}
        >
          {monthlyDisplay}/mo
        </Text>
      </View>

      <View style={styles.providerRow}>
        <View style={[styles.providerPill, { backgroundColor: `${colors.mountainBlue}1A` }]}>
          <Text style={[styles.providerText, { color: colors.mountainBlue }]}>Affirm</Text>
        </View>
        <View style={[styles.providerPill, { backgroundColor: `${colors.mountainBlue}1A` }]}>
          <Text style={[styles.providerText, { color: colors.mountainBlue }]}>Klarna</Text>
        </View>
      </View>

      {variant === 'pdp' && (
        <View style={styles.termsRow}>
          {terms.map((term) => (
            <Text key={term.months} style={[styles.termOption, { color: colors.mutedBrown }]}>
              {term.months}mo: {formatPrice(term.monthlyPayment)}
            </Text>
          ))}
        </View>
      )}

      <Text style={[styles.cta, { color: colors.mountainBlue }]}>See payment options →</Text>
    </View>
  );

  const a11yLabel = `Pay as low as ${monthlyDisplay} per month with Affirm or Klarna. Tap to see payment options.`;

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        activeOpacity={0.7}
        style={{ marginTop: spacing.sm }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={{ marginTop: spacing.sm }}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  containerCart: {
    padding: 12,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexWrap: 'wrap',
  },
  monthlyLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  monthlyAmount: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  monthlyAmountCart: {
    fontSize: 18,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  providerPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  providerText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  termsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  termOption: {
    fontSize: 12,
    fontWeight: '500',
  },
  cta: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
});
