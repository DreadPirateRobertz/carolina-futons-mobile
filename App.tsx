import React, { useState, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme';
import { HomeScreen, ARScreen } from '@/screens';

type Screen = 'home' | 'ar';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  const openAR = useCallback(() => setScreen('ar'), []);
  const closeAR = useCallback(() => setScreen('home'), []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {screen === 'ar' ? <ARScreen onClose={closeAR} /> : <HomeScreen onOpenAR={openAR} />}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
