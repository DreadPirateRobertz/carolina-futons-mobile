/**
 * FinancingCalculator — display-only monthly payment breakdown on PDP.
 *
 * Shows Affirm (3/6/12-month amortized terms) and Afterpay (pay-in-4
 * biweekly installments) side-by-side via a tab toggle.
 *
 * Display only — no CTA to launch provider apps or initiate checkout.
 * For the checkout-integrated BNPL flow, see BNPLHeroSurface + BNPLModal.
 *
 * Bead: cfutons_mobile-lub
 */
import { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import {
  isFinancingEligible,
  getFinancingTerms,
  isAfterpayEligible,
  getAfterpayInstallments,
  FINANCING_APR,
} from '@/utils/financing';
import { formatPrice } from '@/utils';

type Provider = 'affirm' | 'afterpay';

interface Props {
  price: number;
  testID?: string;
}

const APR_DISPLAY = `${(FINANCING_APR * 100).toFixed(2)}%`;

export function FinancingCalculator({ price, testID = 'financing-calculator' }: Props) {
  const { colors, spacing, borderRadius } = useTheme();
  const [provider, setProvider] = useState<Provider>('affirm');

  const affirmEligible = isFinancingEligible(price);
  const afterpayEligible = isAfterpayEligible(price);

  // Nothing to show if neither provider accepts this price
  if (!affirmEligible && !afterpayEligible) return null;

  // If only one provider is eligible, lock to it
  const showAfterpaytab = afterpayEligible;
  const showBothTabs = affirmEligible && afterpayEligible;
  const activeProvider: Provider = !affirmEligible
    ? 'afterpay'
    : !afterpayEligible
      ? 'affirm'
      : provider;

  const affirmTerms = affirmEligible ? getFinancingTerms(price) : [];
  const afterpayInstallments = afterpayEligible ? getAfterpayInstallments(price) : [];

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          borderColor: `${colors.mountainBlue}30`,
          borderRadius: borderRadius.lg,
          backgroundColor: `${colors.mountainBlue}08`,
        },
      ]}
    >
      {/* Tab row — only shown when both providers are eligible */}
      {showBothTabs && (
        <View
          style={[
            styles.tabRow,
            { backgroundColor: colors.sandLight, borderRadius: borderRadius.pill },
          ]}
        >
          <TouchableOpacity
            testID="fin-tab-affirm"
            style={[
              styles.tab,
              activeProvider === 'affirm' && [
                styles.tabActive,
                { backgroundColor: colors.white, borderRadius: borderRadius.pill },
              ],
            ]}
            onPress={() => setProvider('affirm')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeProvider === 'affirm' }}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeProvider === 'affirm' ? colors.espresso : colors.espressoLight },
              ]}
            >
              Affirm
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="fin-tab-afterpay"
            style={[
              styles.tab,
              activeProvider === 'afterpay' && [
                styles.tabActive,
                { backgroundColor: colors.white, borderRadius: borderRadius.pill },
              ],
            ]}
            onPress={() => setProvider('afterpay')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeProvider === 'afterpay' }}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeProvider === 'afterpay' ? colors.espresso : colors.espressoLight },
              ]}
            >
              Afterpay
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Single-provider header when only one tab */}
      {!showBothTabs && affirmEligible && (
        <View
          testID="fin-tab-affirm"
          accessibilityState={{ selected: true }}
          style={styles.singleLabel}
        >
          <Text style={[styles.singleLabelText, { color: colors.mountainBlue }]}>Affirm</Text>
        </View>
      )}
      {!showBothTabs && showAfterpaytab && !affirmEligible && (
        <View
          testID="fin-tab-afterpay"
          accessibilityState={{ selected: true }}
          style={styles.singleLabel}
        >
          <Text style={[styles.singleLabelText, { color: colors.mountainBlue }]}>Afterpay</Text>
        </View>
      )}

      <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
        {/* ── Affirm panel ────────────────────────────────────────────── */}
        {activeProvider === 'affirm' && affirmTerms.length > 0 && (
          <View>
            {affirmTerms.map((term) => (
              <View
                key={term.months}
                testID={`fin-affirm-term-${term.months}`}
                style={[styles.termRow, { borderBottomColor: `${colors.mountainBlue}20` }]}
              >
                <Text style={[styles.termLabel, { color: colors.espressoLight }]}>
                  {term.months} months
                </Text>
                <Text
                  testID={`fin-affirm-term-${term.months}-amount`}
                  style={[styles.termAmount, { color: colors.espresso }]}
                >
                  {`${formatPrice(term.monthlyPayment)}/mo`}
                </Text>
              </View>
            ))}
            <Text style={[styles.disclaimer, { color: colors.espressoLight }]}>
              {APR_DISPLAY} APR. Subject to credit approval.
            </Text>
          </View>
        )}

        {/* ── Afterpay panel ──────────────────────────────────────────── */}
        {activeProvider === 'afterpay' && afterpayInstallments.length > 0 && (
          <View>
            <View style={styles.afterpayHeader}>
              <Text
                testID="fin-afterpay-tagline"
                style={[styles.afterpayTagline, { color: colors.espressoLight }]}
              >
                Pay in 4 interest-free installments
              </Text>
            </View>
            {afterpayInstallments.map((inst) => (
              <View
                key={inst.number}
                testID={`fin-afterpay-installment-${inst.number}`}
                style={[styles.termRow, { borderBottomColor: `${colors.mountainBlue}20` }]}
              >
                <Text
                  testID={`fin-afterpay-installment-${inst.number}-label`}
                  style={[styles.termLabel, { color: colors.espressoLight }]}
                >
                  {inst.label}
                </Text>
                <Text
                  testID={`fin-afterpay-installment-${inst.number}-amount`}
                  style={[styles.termAmount, { color: colors.espresso }]}
                >
                  {formatPrice(inst.amount)}
                </Text>
              </View>
            ))}
            <Text style={[styles.disclaimer, { color: colors.espressoLight }]}>
              Interest-free. No impact on credit score.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    marginTop: 12,
    overflow: 'hidden',
  },
  tabRow: {
    flexDirection: 'row',
    margin: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  singleLabel: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  singleLabelText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  termRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  termLabel: {
    fontSize: 14,
  },
  termAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  afterpayHeader: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  afterpayTagline: {
    fontSize: 13,
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 8,
  },
});
