/**
 * Financing badge showing "As low as $X/mo" for eligible products.
 *
 * Compact variant for ProductCard, detail variant for ProductDetailScreen
 * with full term breakdown and disclaimer.
 *
 * Pass `onPress` to make the badge tappable (opens BNPL modal — cm-qmr).
 */
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { isFinancingEligible, getFinancingTerms } from '@/utils/financing';
import { formatPrice } from '@/utils';

interface Props {
  price: number;
  variant?: 'compact' | 'detail';
  onPress?: () => void;
  testID?: string;
}

export function FinancingBadge({ price, variant = 'compact', onPress, testID }: Props) {
  const { colors, borderRadius } = useTheme();

  if (!isFinancingEligible(price)) return null;

  const terms = getFinancingTerms(price);
  if (terms.length === 0) return null;

  // Use the longest term (lowest monthly payment) for the badge
  const lowestTerm = terms[terms.length - 1];

  if (variant === 'compact') {
    const badgeTestID = testID ?? 'financing-badge-compact';
    const inner = (
      <View
        style={[
          styles.compactBadge,
          {
            backgroundColor: `${colors.mountainBlue}22`,
            borderRadius: borderRadius.sm,
            borderColor: colors.mountainBlue,
          },
        ]}
      >
        <Text style={[styles.compactProvider, { color: colors.mountainBlue }]}>
          Klarna · Affirm
        </Text>
        <Text style={[styles.compactAmount, { color: colors.mountainBlue }]}>
          As low as {formatPrice(lowestTerm.monthlyPayment)}/mo
        </Text>
        <Text style={[styles.compactCta, { color: colors.mountainBlue }]}>
          Tap to see options →
        </Text>
      </View>
    );
    if (onPress) {
      return (
        <TouchableOpacity
          onPress={onPress}
          testID={badgeTestID}
          accessibilityRole="button"
          accessibilityLabel={`Financing available. As low as ${formatPrice(lowestTerm.monthlyPayment)} per month with Klarna or Affirm. Tap to see options.`}
          activeOpacity={0.7}
        >
          {inner}
        </TouchableOpacity>
      );
    }
    return (
      <View
        testID={badgeTestID}
        accessibilityLabel={`Financing available. As low as ${formatPrice(lowestTerm.monthlyPayment)} per month with Klarna or Affirm.`}
      >
        {inner}
      </View>
    );
  }

  // detail variant
  const detailTestID = testID ?? 'financing-badge-detail';
  const detailInner = (
    <>
      <Text style={[styles.detailTitle, { color: colors.mountainBlue }]}>
        As low as {formatPrice(lowestTerm.monthlyPayment)}/mo with Klarna
      </Text>
      <View style={styles.termsRow}>
        {terms.map((term) => (
          <View
            key={term.months}
            style={[styles.termPill, { backgroundColor: `${colors.mountainBlue}15` }]}
          >
            <Text style={[styles.termText, { color: colors.mountainBlue }]}>
              {term.months}mo: {formatPrice(term.monthlyPayment)}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[styles.disclaimer, { color: colors.espressoLight }]}>
        Subject to credit approval. {FINANCING_APR_DISPLAY} APR.
      </Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        testID={detailTestID}
        accessibilityRole="button"
        accessibilityLabel="View financing options"
        activeOpacity={0.7}
      >
        <View style={[styles.detailContainer, { borderColor: colors.mountainBlue }]}>
          {detailInner}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.detailContainer, { borderColor: colors.mountainBlue }]}
      testID={detailTestID}
    >
      {detailInner}
    </View>
  );
}

const FINANCING_APR_DISPLAY = '9.99%';

const styles = StyleSheet.create({
  compactBadge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'stretch',
    borderWidth: 1.5,
    marginTop: 4,
    gap: 2,
  },
  compactProvider: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  compactAmount: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  compactCta: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
  },
  detailContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  termsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  termPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  termText: {
    fontSize: 13,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 14,
  },
});
