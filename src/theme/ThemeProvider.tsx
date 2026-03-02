import React, { createContext, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { colors, darkPalette, spacing, borderRadius, shadows, typography, transitions } from './tokens';

type ColorMode = 'light' | 'dark';

type Colors = { [K in keyof typeof colors]: string };

const darkColors: Colors = {
  ...colors,
  // Editorial dark palette — maps semantic names to darkPalette
  sandBase: darkPalette.background,
  sandLight: darkPalette.surface,
  sandDark: darkPalette.surfaceElevated,
  espresso: darkPalette.textPrimary,
  espressoLight: darkPalette.textMuted,
  offWhite: darkPalette.surface,
  white: darkPalette.background,
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
    initialColorMode ?? 'dark',
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
