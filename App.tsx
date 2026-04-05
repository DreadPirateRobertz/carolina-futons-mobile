import 'react-native-url-polyfill/auto';
import React, { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { LivingSkyLoadingView } from '@/components/LivingSkyLoadingView';
import { ThemeProvider } from '@/theme';
import { AuthProvider } from '@/hooks/useAuth';
import { CartProvider } from '@/hooks/useCart';
import { MiniCartDrawerProvider } from '@/hooks/useMiniCartDrawer';
import { WishlistProvider } from '@/hooks/useWishlist';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { NotificationProvider } from '@/hooks/useNotifications';
import { DeepLinkProvider } from '@/hooks/DeepLinkProvider';
import { PremiumProvider } from '@/hooks/usePremium';
import { RecommendationsProvider } from '@/hooks/useRecommendations';
import { CompareProvider } from '@/contexts/CompareContext';
import { CartAbandonmentBridge } from '@/components/CartAbandonmentBridge';
import { StreakMilestoneBridge } from '@/components/StreakMilestoneBridge';
import { PostPurchaseReviewBridge } from '@/components/PostPurchaseReviewBridge';
import { OnboardingStyleModalBridge } from '@/components/OnboardingStyleModalBridge';
import { runSecurityAudit } from '@/services/securityAudit';
import { NPSSurveyBridge } from '@/components/NPSSurveyBridge';
import { WixProvider } from '@/services/wix/wixProvider';
import { getWixConfig, isWixConfigured } from '@/services/wix/config';

import { AppNavigator, linkingConfig } from '@/navigation';
import { MiniCartDrawerHost } from '@/navigation/MiniCartDrawerHost';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initCrashReporting, getSentryNavigationIntegration } from '@/services/crashReportingInit';
import { wrapWithSentry } from '@/services/providers/sentryCrashReporting';
import { initAnalytics } from '@/services/analyticsInit';
import { initializePurchases } from '@/services/purchases';
import { prefetchCriticalData } from '@/services/prefetch';
import { useScreenTracking } from '@/hooks/useScreenTracking';
import { startFunnelTracking } from '@/services/funnelTracker';
import { useForceUpdate } from '@/hooks/useForceUpdate';
import { ForceUpdateModal } from '@/components/ForceUpdateModal';
import { useTriggerMoments } from '@/hooks/useTriggerMoments';
import { TierCelebrationModal } from '@/components/TierCelebrationModal';

const STRIPE_MERCHANT_ID = 'merchant.com.carolinafutons';
const wixConfig = getWixConfig();
const wixEnabled = isWixConfigured();

function MaybeWixProvider({ children }: { children: React.ReactNode }) {
  if (!wixEnabled) return <>{children}</>;
  return (
    <WixProvider apiKey={wixConfig.apiKey} siteId={wixConfig.siteId} baseUrl={wixConfig.baseUrl}>
      {children}
    </WixProvider>
  );
}

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
  const {
    navigationRef,
    onStateChange: trackState,
    onReady: onScreenTrackingReady,
  } = useScreenTracking();
  const [currentRoute, setCurrentRoute] = useState<string | undefined>();

  const onStateChange = useCallback(() => {
    trackState();
    setCurrentRoute(navigationRef.getCurrentRoute()?.name);
  }, [trackState, navigationRef]);
  const forceUpdate = useForceUpdate();
  const { triggers, dismiss } = useTriggerMoments();

  // Defer non-critical service init to after first render for faster cold start
  useEffect(() => {
    initAnalytics({
      mixpanelToken: process.env.EXPO_PUBLIC_MIXPANEL_TOKEN,
    });
    startFunnelTracking();
    initializePurchases();
    // cm-keo: audit AsyncStorage for sensitive keys that should be in SecureStore
    runSecurityAudit();
  }, []);
  const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

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
    return <LivingSkyLoadingView />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider onLayout={onLayoutRootView}>
        <StripeProvider publishableKey={stripeKey} merchantIdentifier={STRIPE_MERCHANT_ID}>
          <ThemeProvider>
            <ConnectivityProvider>
              <MaybeWixProvider>
                <AuthProvider>
                  <CartProvider>
                    <MiniCartDrawerProvider>
                      <WishlistProvider>
                        <NotificationProvider>
                          <CartAbandonmentBridge />
                          <StreakMilestoneBridge />
                          <PostPurchaseReviewBridge />
                          <OnboardingStyleModalBridge />
                          <NPSSurveyBridge />
                          <PremiumProvider>
                            <RecommendationsProvider>
                              <CompareProvider>
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
                                      <MiniCartDrawerHost
                                        navigationRef={navigationRef}
                                        currentRoute={currentRoute}
                                      />
                                      <ForceUpdateModal
                                        visible={forceUpdate.visible}
                                        required={forceUpdate.required}
                                        onDismiss={forceUpdate.dismiss}
                                      />
                                      <TierCelebrationModal
                                        newTier={triggers.tierChanged}
                                        onDismiss={() => dismiss('tierChanged')}
                                      />
                                    </DeepLinkProvider>
                                  </NavigationContainer>
                                </ErrorBoundary>
                              </CompareProvider>
                            </RecommendationsProvider>
                          </PremiumProvider>
                        </NotificationProvider>
                      </WishlistProvider>
                    </MiniCartDrawerProvider>
                  </CartProvider>
                </AuthProvider>
              </MaybeWixProvider>
            </ConnectivityProvider>
          </ThemeProvider>
        </StripeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default wrapWithSentry(App);
