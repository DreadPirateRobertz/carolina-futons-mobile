/**
 * @module ReferralLandingScreen
 *
 * Handles carolinafutons://referral/{code} deep links — cm-z0x.
 *
 * On mount: stores the referral code in AsyncStorage via useReferral,
 * then immediately navigates to the Account tab so the user can sign up.
 * Shows a brief "Welcome!" message while the redirect is in progress.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { useReferral } from '@/hooks/useReferral';
import { useTheme } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ReferralLanding'>;

export function ReferralLandingScreen({ route, navigation }: Props) {
  const { code } = route.params;
  const { colors, typography } = useTheme();
  const { storeReferredByCode } = useReferral();

  useEffect(() => {
    let active = true;
    (async () => {
      await storeReferredByCode(code);
      if (active) {
        // Navigate to Account tab — the user can sign up there
        navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
      }
    })();
    return () => {
      active = false;
    };
  }, [code, storeReferredByCode, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.sandBase }]} testID="referral-landing">
      <Text
        style={[styles.title, { color: colors.espresso, fontFamily: typography.headingFamily }]}
        testID="referral-landing-title"
      >
        Welcome to Carolina Futons!
      </Text>
      <Text style={[styles.subtitle, { color: colors.espressoLight }]}>
        Your referral code has been saved. Sign in or create an account to redeem your discount.
      </Text>
      <ActivityIndicator color={colors.espresso} style={styles.spinner} />
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
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  spinner: {
    marginTop: 8,
  },
});
