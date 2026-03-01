import React, { useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
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
import { AppNavigator, linkingConfig } from '@/navigation';
import { OfflineBanner } from '@/components/OfflineBanner';
import { initAnalytics } from '@/services/analyticsInit';
import { useScreenTracking } from '@/hooks/useScreenTracking';

SplashScreen.preventAutoHideAsync();

// Initialize analytics providers at module load
initAnalytics({
  firebase: true,
  // Mixpanel token should come from env/config — placeholder for now
  // mixpanel: { token: 'YOUR_MIXPANEL_TOKEN' },
});

export default function App() {
  const navigationRef = useNavigationContainerRef();
  const { onStateChange, onReady } = useScreenTracking(navigationRef);

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
      <ThemeProvider>
        <ConnectivityProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <NotificationProvider>
                  <NavigationContainer
                    ref={navigationRef}
                    linking={linkingConfig}
                    onStateChange={onStateChange}
                    onReady={onReady}
                  >
                    <OfflineBanner />
                    <AppNavigator />
                  </NavigationContainer>
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
