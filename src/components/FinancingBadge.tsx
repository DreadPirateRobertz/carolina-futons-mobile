/**
 * Financing badge showing "As low as $X/mo" for eligible products.
 *
 * Compact variant for ProductCard, detail variant for ProductDetailScreen
 * with full term breakdown and disclaimer.
 */
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '@/theme';
import { isFinancingEligible, getFinancingTerms } from '@/utils/financing';
import { formatPrice } from '@/utils';

interface Props {
  price: number;
  variant?: 'compact' | 'detail';
  testID?: string;
}

export function FinancingBadge({ price, variant = 'compact', testID }: Props) {
  const { colors, spacing, borderRadius } = useTheme();

  if (!isFinancingEligible(price)) return null;

  const terms = getFinancingTerms(price);
  if (terms.length === 0) return null;

  // Use the longest term (lowest monthly payment) for the badge
  const lowestTerm = terms[terms.length - 1];

  if (variant === 'compact') {
    return (
      <View
        style={[
          styles.compactBadge,
          { backgroundColor: colors.mountainBlue, borderRadius: borderRadius.sm },
        ]}
        testID={testID ?? 'financing-badge'}
      >
        <Text style={styles.compactText}>
          As low as {formatPrice(lowestTerm.monthlyPayment)}/mo
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.detailContainer, { borderColor: colors.mountainBlue }]}
      testID={testID ?? 'financing-badge'}
    >
      <Text style={[styles.detailTitle, { color: colors.mountainBlue }]}>
        As low as {formatPrice(lowestTerm.monthlyPayment)}/mo
      </Text>
      <View style={styles.termsRow}>
        {terms.map((term) => (
          <View key={term.months} style={[styles.termPill, { backgroundColor: `${colors.mountainBlue}15` }]}>
            <Text style={[styles.termText, { color: colors.mountainBlue }]}>
              {term.months}mo: {formatPrice(term.monthlyPayment)}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[styles.disclaimer, { color: colors.espressoLight }]}>
        Subject to credit approval. {FINANCING_APR_DISPLAY} APR.
      </Text>
    </View>
  );
}

const FINANCING_APR_DISPLAY = '9.99%';

const styles = StyleSheet.create({
  compactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  compactText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
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
