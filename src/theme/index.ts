/**
 * Theme barrel export.
 *
 * Re-exports every design token, the ThemeProvider context, and the useTheme
 * hook so that consumers only need `import { ... } from '@/theme'`.
 */

export {
  colors,
  darkPalette,
  spacing,
  borderRadius,
  shadows,
  typography,
  transitions,
  easing,
} from './tokens';
export { ThemeProvider, ThemeContext } from './ThemeProvider';
export type { Theme } from './ThemeProvider';
export { useTheme } from './useTheme';
