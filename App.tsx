import 'react-native-url-polyfill/auto';
import React, { useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
} from '@expo-google-fonts/source-sans-3';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from '@/theme';
import { AuthProvider } from '@/hooks/useAuth';
import { CartProvider } from '@/hooks/useCart';
import { WishlistProvider } from '@/hooks/useWishlist';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { NotificationProvider } from '@/hooks/useNotifications';
import { AppNavigator, linkingConfig } from '@/navigation';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initCrashReporting } from '@/services/crashReportingInit';
import { initAnalytics } from '@/services/analyticsInit';

const STRIPE_MERCHANT_ID = 'merchant.com.carolinafutons';

// Initialize crash reporting before anything else can throw
initCrashReporting({
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
});

// Initialize analytics providers (Firebase + Mixpanel)
initAnalytics({
  mixpanelToken: process.env.EXPO_PUBLIC_MIXPANEL_TOKEN,
});

SplashScreen.preventAutoHideAsync();

export default function App() {
  const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!stripeKey) {
    throw new Error(
      'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Add it to your .env file.',
    );
  }

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#E8845C" />
      </View>
    );
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <StripeProvider
        publishableKey={stripeKey}
        merchantIdentifier={STRIPE_MERCHANT_ID}
      >
        <ThemeProvider>
          <ConnectivityProvider>
            <AuthProvider>
              <CartProvider>
                <WishlistProvider>
                  <NotificationProvider>
                    <ErrorBoundary>
                      <NavigationContainer linking={linkingConfig}>
                        <OfflineBanner />
                        <AppNavigator />
                      </NavigationContainer>
                    </ErrorBoundary>
                  </NotificationProvider>
                </WishlistProvider>
              </CartProvider>
            </AuthProvider>
          </ConnectivityProvider>
        </ThemeProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8D5B7',
  },
});
