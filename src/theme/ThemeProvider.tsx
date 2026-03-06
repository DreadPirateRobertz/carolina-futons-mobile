/**
 * Theme provider and context for the Carolina Futons mobile app.
 *
 * Wraps the component tree to supply design tokens (colors, spacing,
 * typography, shadows, transitions) via React context. Supports light and
 * dark color modes with a toggle function. The default mode is dark because
 * the editorial "premium browse" experience is designed dark-first.
 */

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

/** Active color scheme — drives which palette the provider exposes */
type ColorMode = 'light' | 'dark';

/** Mapped type that mirrors the `colors` token keys but widens values to `string` */
type Colors = { [K in keyof typeof colors]: string };

/** Shape of a single shadow preset (iOS shadow properties + Android elevation) */
interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  /** Android-only elevation value */
  elevation: number;
}

/** Mapped type mirroring the `shadows` token keys */
type Shadows = { [K in keyof typeof shadows]: ShadowStyle };

/**
 * Dark-mode color overrides.
 *
 * Spreads the base palette and selectively replaces tokens with darkPalette
 * values. Accent colors are slightly desaturated so they look comfortable
 * against the dark backgrounds without appearing neon.
 */
const darkColors: Colors = {
  ...colors,
  // Maps semantic color names to the editorial dark palette equivalents
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

/**
 * Dark-mode shadow overrides.
 *
 * Uses pure black shadow color with higher opacity because dark surfaces
 * need stronger shadows to convey depth. The `button` preset retains its
 * coral glow even in dark mode for CTA (Call To Action) emphasis.
 */
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

/**
 * Complete theme object exposed via context.
 *
 * Contains every design token needed to style components, plus the active
 * color mode and a toggle function so that any component can switch modes.
 */
export interface Theme {
  /** Active color palette (light or dark) */
  colors: Colors;
  /** Spacing scale tokens */
  spacing: typeof spacing;
  /** Border radius tokens */
  borderRadius: typeof borderRadius;
  /** Shadow presets (light or dark) */
  shadows: Shadows;
  /** Typography scale and font families */
  typography: typeof typography;
  /** Animation transition presets */
  transitions: typeof transitions;
  /** Current color mode */
  colorMode: ColorMode;
  /** Flip between light and dark mode */
  toggleColorMode: () => void;
  /** Convenience boolean — true when colorMode is 'dark' */
  isDark: boolean;
}

/** React context that holds the current {@link Theme}. Starts as `null` until a provider mounts. */
export const ThemeContext = createContext<Theme | null>(null);

/** Props accepted by {@link ThemeProvider}. */
interface ThemeProviderProps {
  /** Child component tree that will have access to the theme */
  children: React.ReactNode;
  /** Override the default starting color mode (defaults to 'dark') */
  initialColorMode?: ColorMode;
}

/**
 * Provides the theme context to all descendants.
 *
 * @param props.children - Component tree to wrap.
 * @param props.initialColorMode - Starting color mode; defaults to `'dark'`
 *   because the editorial browse experience is designed dark-first.
 */
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
