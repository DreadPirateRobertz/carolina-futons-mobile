import React, { useState, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme';
import { WishlistProvider } from '@/hooks/useWishlist';
import { CartProvider } from '@/hooks/useCart';
import { HomeScreen, ARScreen, ShopScreen } from '@/screens';

type Screen = 'home' | 'ar' | 'shop';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  const openAR = useCallback(() => setScreen('ar'), []);
  const openShop = useCallback(() => setScreen('shop'), []);
  const goHome = useCallback(() => setScreen('home'), []);

  if (screen === 'ar') {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <CartProvider>
            <WishlistProvider>
              <ARScreen onClose={goHome} />
            </WishlistProvider>
          </CartProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  if (screen === 'shop') {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <ShopScreen />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <HomeScreen onOpenAR={openAR} onOpenShop={openShop} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
