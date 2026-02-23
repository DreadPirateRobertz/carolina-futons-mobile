import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme';
import { AuthProvider } from '@/hooks/useAuth';
import { CartProvider } from '@/hooks/useCart';
import { WishlistProvider } from '@/hooks/useWishlist';
import { ConnectivityProvider } from '@/hooks/useConnectivity';
import { AppNavigator, linkingConfig } from '@/navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ConnectivityProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <NavigationContainer linking={linkingConfig}>
                  <AppNavigator />
                </NavigationContainer>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </ConnectivityProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
