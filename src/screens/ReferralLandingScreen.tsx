/**
 * @module ReferralLandingScreen
 *
 * Handles carolinafutons://referral/{code} deep links — cm-z0x + cm-lnd.
 *
 * On mount: stores the referral code in AsyncStorage via useReferral.
 * Shows a welcome card with discount offer and a CTA button to sign up /
 * create an account. Navigation to Tabs happens only when the CTA is pressed.
 */
import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { useReferral } from '@/hooks/useReferral';
import { useTheme } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ReferralLanding'>;

export function ReferralLandingScreen({ route, navigation }: Props) {
  const { code } = route.params;
  const { colors, typography } = useTheme();
  const { storeReferredByCode } = useReferral();

  // Store the referral code on mount — no auto-navigation.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await storeReferredByCode(code);
      } catch (e) {
        if (active) {
          console.warn('[ReferralLandingScreen] Failed to store referral code:', e);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [code, storeReferredByCode]);

  const handleCta = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  }, [navigation]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.sandBase }]}
      testID="referral-landing"
    >
      <Text
        style={[styles.title, { color: colors.espresso, fontFamily: typography.headingFamily }]}
        testID="referral-landing-title"
      >
        Welcome to Carolina Futons!
      </Text>

      <Text
        style={[styles.discount, { color: colors.espresso }]}
        testID="referral-landing-discount"
      >
        Your friend sent you $25 off your first purchase.
      </Text>

      <Text style={[styles.subtitle, { color: colors.espressoLight }]}>
        Create an account or sign in to redeem your referral discount at checkout.
      </Text>

      <Pressable
        style={[styles.cta, { backgroundColor: colors.espresso }]}
        onPress={handleCta}
        testID="referral-landing-cta"
        accessibilityRole="button"
        accessibilityLabel="Get started — create an account"
      >
        <Text style={[styles.ctaText, { color: colors.sandBase }]}>Get Started</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  discount: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  cta: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
