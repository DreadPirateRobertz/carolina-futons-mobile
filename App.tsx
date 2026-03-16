import 'react-native-url-polyfill/auto';
import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { BrandedSpinner } from '@/components/BrandedSpinner';
import { ThemeProvider } from '@/theme';
import { AuthProvider } from '@/hooks/useAuth';
import { CartProvider } from '@/hooks/useCart';
import { WishlistProvider } from '@/hooks/useWishlist';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { NotificationProvider } from '@/hooks/useNotifications';
import { DeepLinkProvider } from '@/hooks/DeepLinkProvider';
import { PremiumProvider } from '@/hooks/usePremium';
import { CartAbandonmentBridge } from '@/components/CartAbandonmentBridge';

import { AppNavigator, linkingConfig } from '@/navigation';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initCrashReporting, getSentryNavigationIntegration } from '@/services/crashReportingInit';
import { wrapWithSentry } from '@/services/providers/sentryCrashReporting';
import { initAnalytics } from '@/services/analyticsInit';
import { initializePurchases } from '@/services/purchases';
import { prefetchCriticalData } from '@/services/prefetch';
import { useScreenTracking } from '@/hooks/useScreenTracking';
import { useForceUpdate } from '@/hooks/useForceUpdate';
import { ForceUpdateModal } from '@/components/ForceUpdateModal';

const STRIPE_MERCHANT_ID = 'merchant.com.carolinafutons';

// Initialize crash reporting before anything else can throw
initCrashReporting({
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
});

const sentryNavigationIntegration = getSentryNavigationIntegration();

// Store the promise so hideAsync() can await it — prevents a race where
// hideAsync fires before preventAutoHideAsync resolves (crashes on some devices).
const preventHidePromise = SplashScreen.preventAutoHideAsync();

// Splash-screen data race: start prefetching product data while fonts load.
// By the time the splash hides, product data is already in AsyncStorage
// and useDataCache will serve it instantly without a loading spinner.
prefetchCriticalData();

function App() {
  const { navigationRef, onStateChange, onReady: onScreenTrackingReady } = useScreenTracking();
  const forceUpdate = useForceUpdate();

  // Defer non-critical service init to after first render for faster cold start
  useEffect(() => {
    initAnalytics({
      mixpanelToken: process.env.EXPO_PUBLIC_MIXPANEL_TOKEN,
    });
    initializePurchases();
  }, []);
  const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!stripeKey) {
    throw new Error('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Add it to your .env file.');
  }

  const [fontsLoaded] = useFonts({
    // Load only the 5 weights we use from local assets (saves ~5.4M vs @expo-google-fonts packages)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    PlayfairDisplay_400Regular: require('./assets/fonts/PlayfairDisplay_400Regular.ttf'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    PlayfairDisplay_700Bold: require('./assets/fonts/PlayfairDisplay_700Bold.ttf'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SourceSans3_400Regular: require('./assets/fonts/SourceSans3_400Regular.ttf'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SourceSans3_600SemiBold: require('./assets/fonts/SourceSans3_600SemiBold.ttf'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SourceSans3_700Bold: require('./assets/fonts/SourceSans3_700Bold.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await preventHidePromise;
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <BrandedSpinner size="large" color="#E8845C" />
      </View>
    );
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <StripeProvider publishableKey={stripeKey} merchantIdentifier={STRIPE_MERCHANT_ID}>
        <ThemeProvider>
          <ConnectivityProvider>
            <AuthProvider>
              <CartProvider>
                <WishlistProvider>
                  <NotificationProvider>
                    <CartAbandonmentBridge />
                    <PremiumProvider>
                      <ErrorBoundary>
                        <NavigationContainer
                          ref={navigationRef}
                          linking={linkingConfig}
                          onStateChange={onStateChange}
                          onReady={() => {
                            onScreenTrackingReady();
                            if (sentryNavigationIntegration && navigationRef.current) {
                              (
                                sentryNavigationIntegration as {
                                  registerNavigationContainer: (ref: unknown) => void;
                                }
                              ).registerNavigationContainer(navigationRef);
                            }
                          }}
                        >
                          <DeepLinkProvider>
                            <OfflineBanner />
                            <AppNavigator />
                            <ForceUpdateModal
                              visible={forceUpdate.visible}
                              required={forceUpdate.required}
                              onDismiss={forceUpdate.dismiss}
                            />
                          </DeepLinkProvider>
                        </NavigationContainer>
                      </ErrorBoundary>
                    </PremiumProvider>
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

export default wrapWithSentry(App);

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8D5B7',
  },
});
