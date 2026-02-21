import React, { createContext, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { colors, spacing, borderRadius, shadows, typography, transitions } from './tokens';

type ColorMode = 'light' | 'dark';

type Colors = { [K in keyof typeof colors]: string };

const darkColors: Colors = {
  ...colors,
  // Invert key surfaces for dark mode
  sandBase: '#1A1410',
  sandLight: '#231C15',
  sandDark: '#2E241A',
  espresso: '#F2E8D5',
  espressoLight: '#D4BC96',
  white: '#1A1410',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export interface Theme {
  colors: Colors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  typography: typeof typography;
  transitions: typeof transitions;
  colorMode: ColorMode;
  toggleColorMode: () => void;
}

export const ThemeContext = createContext<Theme | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialColorMode?: ColorMode;
}

export function ThemeProvider({ children, initialColorMode }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [colorMode, setColorMode] = useState<ColorMode>(
    initialColorMode ?? (systemScheme === 'dark' ? 'dark' : 'light'),
  );

  const toggleColorMode = useCallback(() => {
    setColorMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const theme = useMemo<Theme>(
    () => ({
      colors: colorMode === 'dark' ? darkColors : colors,
      spacing,
      borderRadius,
      shadows,
      typography,
      transitions,
      colorMode,
      toggleColorMode,
    }),
    [colorMode, toggleColorMode],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
