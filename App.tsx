import 'react-native-url-polyfill/auto';
import React, { useCallback, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import { useScreenTracking } from '@/hooks/useScreenTracking';
import { useDeepLink } from '@/hooks/useDeepLink';
import { AppNavigator, linkingConfig } from '@/navigation';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initAnalytics } from '@/services/analyticsInit';
import { trackEvent } from '@/services/analytics';
import { initCrashReporting } from '@/services/crashReportingInit';
import { perf } from '@/services/performance';

// Initialize crash reporting as early as possible (before component render)
initCrashReporting({
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
});

// Mark JS init time as early as possible (module evaluation)
perf.markStartup('js_init');

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
  });

  const { navigationRef, onStateChange, onReady: onScreenTrackingReady } = useScreenTracking();

  const onReady = useCallback(() => {
    onScreenTrackingReady();
    perf.markStartup('nav_ready');
    perf.markStartup('interactive');
    perf.reportStartup();
  }, [onScreenTrackingReady]);

  useDeepLink({
    onDeepLink: (parsed, route) => {
      trackEvent('deep_link_opened', {
        screen: route.screen,
        path: parsed.path,
        ...(parsed.utm && {
          utm_source: parsed.utm.source,
          utm_medium: parsed.utm.medium,
          utm_campaign: parsed.utm.campaign,
        }),
      });
    },
  });

  useEffect(() => {
    initAnalytics({
      enableFirebase: true,
      enableMixpanel: true,
      mixpanelToken: process.env.EXPO_PUBLIC_MIXPANEL_TOKEN,
    }).then(() => {
      perf.markStartup('analytics_init');
      trackEvent('app_open');
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      perf.markStartup('fonts_loaded');
    }
  }, [fontsLoaded]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      perf.markStartup('first_render');
      await SplashScreen.hideAsync();
      perf.startMemoryMonitoring();
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
      <ThemeProvider>
        <ConnectivityProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <NotificationProvider>
                  <ErrorBoundary>
                    <NavigationContainer
                      ref={navigationRef}
                      linking={linkingConfig}
                      onStateChange={onStateChange}
                      onReady={onReady}
                    >
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
