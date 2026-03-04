import React, { createContext, useMemo, useState, useCallback } from 'react';
import {
  colors,
  darkPalette,
  spacing,
  borderRadius,
  shadows,
  typography,
  transitions,
} from './tokens';

type ColorMode = 'light' | 'dark';

type Colors = { [K in keyof typeof colors]: string };

interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

type Shadows = { [K in keyof typeof shadows]: ShadowStyle };

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
  // Accent blues — slightly desaturated for dark surfaces
  mountainBlue: '#6FA3BA',
  mountainBlueDark: '#5B8FA8',
  mountainBlueLight: '#3D5A66',
  // Accent corals — slightly muted warm
  sunsetCoral: '#E8845C',
  sunsetCoralDark: '#D4724A',
  sunsetCoralLight: '#4A3028',
  // Tertiary
  mauve: '#8A6B6B',
  // Gradients (for decorative use)
  skyGradientTop: '#1E2D36',
  skyGradientBottom: '#3A2D1A',
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  // Semantic
  success: '#5A9C6D',
  error: '#E8845C',
  muted: '#7A7A7A',
  mutedBrown: '#9A8A72',
};

const darkShadows: Shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHover: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 6,
  },
  nav: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  modal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 48,
    elevation: 10,
  },
  button: {
    shadowColor: '#E8845C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
};

export interface Theme {
  colors: Colors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: Shadows;
  typography: typeof typography;
  transitions: typeof transitions;
  colorMode: ColorMode;
  toggleColorMode: () => void;
  isDark: boolean;
}

export const ThemeContext = createContext<Theme | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialColorMode?: ColorMode;
}

export function ThemeProvider({ children, initialColorMode }: ThemeProviderProps) {
  const [colorMode, setColorMode] = useState<ColorMode>(initialColorMode ?? 'dark');

  const toggleColorMode = useCallback(() => {
    setColorMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const isDark = colorMode === 'dark';

  const theme = useMemo<Theme>(
    () => ({
      colors: isDark ? darkColors : colors,
      spacing,
      borderRadius,
      shadows: isDark ? darkShadows : shadows,
      typography,
      transitions,
      colorMode,
      toggleColorMode,
      isDark,
    }),
    [colorMode, isDark, toggleColorMode],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
