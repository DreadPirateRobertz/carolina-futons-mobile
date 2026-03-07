/**
 * @module PremiumScreen
 *
 * CF+ premium subscription screen. Displays the value proposition (AR Room
 * Designer, Early Access, Free Shipping), subscription plan options (monthly
 * and annual), and a restore-purchases link. Uses the dark theme with
 * MountainSkyline header and GlassCard containers.
 */

import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { MountainSkyline } from '@/components/MountainSkyline';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { usePremium } from '@/hooks/usePremium';

interface Props {
  onBack: () => void;
  testID?: string;
}

const FEATURES = [
  {
    title: 'AR Room Designer',
    description: 'Place multiple futons, scan your room, and save designs.',
  },
  {
    title: 'Early Access',
    description: 'Preview new collections before they launch.',
  },
  {
    title: 'Free Shipping',
    description: 'Free shipping on every order, no minimum.',
  },
];

function PremiumScreenInner({ onBack, testID }: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const { isPremium, offerings, error, purchase, restore } = usePremium();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const monthlyPkg = offerings.find(
    (p) => p.packageType === 'MONTHLY' || p.identifier === '$rc_monthly',
  );
  const annualPkg = offerings.find(
    (p) => p.packageType === 'ANNUAL' || p.identifier === '$rc_annual',
  );

  const handlePurchase = async (pkg: typeof monthlyPkg, id: string) => {
    if (!pkg) return;
    setPurchasing(id);
    const success = await purchase(pkg);
    setPurchasing(null);
    if (success) {
      Alert.alert('Welcome to CF+!', 'Your premium features are now unlocked.');
    }
  };

  const handleRestore = async () => {
    const success = await restore();
    Alert.alert(
      success ? 'Restored!' : 'No Purchases Found',
      success
        ? 'Your CF+ subscription has been restored.'
        : 'We could not find any previous purchases for this account.',
    );
  };

  if (isPremium) {
    return (
      <View
        style={[styles.root, { backgroundColor: darkPalette.background }]}
        testID={testID ?? 'premium-screen'}
      >
        <MountainSkyline variant="sunrise" height={100} />
        <View style={styles.activeContent}>
          <Text
            style={[styles.badge, { color: colors.success, fontFamily: typography.headingFamily }]}
          >
            CF+ Active
          </Text>
          <Text style={[styles.activeTitle, { color: darkPalette.textPrimary, fontFamily: typography.headingFamily }]}>
            You're a CF+ member
          </Text>
          <Text style={[styles.activeMessage, { color: darkPalette.textMuted }]}>
            All premium features are unlocked. Thank you for your support!
          </Text>
          <Button label="Back" variant="ghost" onPress={onBack} testID="premium-back" />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.root, { backgroundColor: darkPalette.background }]}
      testID={testID ?? 'premium-screen'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <MountainSkyline variant="sunset" height={120} />

        {/* Back button */}
        <TouchableOpacity
          style={[styles.backButton, { top: spacing.xxl }]}
          onPress={onBack}
          testID="premium-back"
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={[styles.backText, { color: darkPalette.textPrimary }]}>{'<'} Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
          <Text
            style={[
              styles.title,
              { color: colors.sunsetCoral, fontFamily: typography.headingFamily },
            ]}
          >
            CF+
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: darkPalette.textPrimary, fontFamily: typography.headingFamily },
            ]}
          >
            Unlock Premium Features
          </Text>
        </View>

        {/* Features */}
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {FEATURES.map((feature) => (
            <GlassCard key={feature.title} intensity="light">
              <View style={styles.featureRow}>
                <View style={styles.featureText}>
                  <Text
                    style={[
                      styles.featureTitle,
                      { color: darkPalette.textPrimary, fontFamily: typography.headingFamily },
                    ]}
                  >
                    {feature.title}
                  </Text>
                  <Text style={[styles.featureDesc, { color: darkPalette.textMuted }]}>
                    {feature.description}
                  </Text>
                </View>
              </View>
            </GlassCard>
          ))}
        </View>

        {/* Plan options */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl, gap: spacing.md }}>
          {monthlyPkg && (
            <GlassCard intensity="medium">
              <TouchableOpacity
                style={styles.planCard}
                onPress={() => handlePurchase(monthlyPkg, 'monthly')}
                disabled={purchasing !== null}
                testID="purchase-monthly"
                accessibilityRole="button"
                accessibilityLabel={`Subscribe monthly for ${monthlyPkg.product.priceString}`}
              >
                <View>
                  <Text style={[styles.planName, { color: darkPalette.textPrimary }]}>Monthly</Text>
                  <Text style={[styles.planDetail, { color: darkPalette.textMuted }]}>
                    Cancel anytime
                  </Text>
                </View>
                <Text style={[styles.planPrice, { color: colors.sunsetCoral }]}>
                  {monthlyPkg.product.priceString}
                </Text>
              </TouchableOpacity>
            </GlassCard>
          )}

          {annualPkg && (
            <GlassCard intensity="heavy">
              <TouchableOpacity
                style={styles.planCard}
                onPress={() => handlePurchase(annualPkg, 'annual')}
                disabled={purchasing !== null}
                testID="purchase-annual"
                accessibilityRole="button"
                accessibilityLabel={`Subscribe annually for ${annualPkg.product.priceString}`}
              >
                <View>
                  <Text style={[styles.planName, { color: darkPalette.textPrimary }]}>Annual</Text>
                  <Text style={[styles.planDetail, { color: colors.success }]}>Save 33%</Text>
                </View>
                <Text style={[styles.planPrice, { color: colors.sunsetCoral }]}>
                  {annualPkg.product.priceString}
                </Text>
              </TouchableOpacity>
            </GlassCard>
          )}

          {error && (
            <Text style={[styles.errorText, { color: colors.sunsetCoral }]} testID="purchase-error">
              {error}
            </Text>
          )}
        </View>

        {/* Restore */}
        <View style={{ alignItems: 'center', marginTop: spacing.xl, paddingBottom: spacing.xxl }}>
          <TouchableOpacity
            onPress={handleRestore}
            testID="restore-purchases"
            accessibilityRole="button"
            accessibilityLabel="Restore previous purchases"
          >
            <Text style={[styles.restoreText, { color: colors.mountainBlue }]}>
              Restore Purchases
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export function PremiumScreen(props: Props) {
  return <PremiumScreenInner {...props} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 4,
  },
  // Features
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Plans
  planCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
  },
  planDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '800',
  },
  // Active state
  activeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  badge: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  activeTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  activeMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  // Misc
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  restoreText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
