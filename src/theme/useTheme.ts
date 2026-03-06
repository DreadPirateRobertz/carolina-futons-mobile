/**
 * Convenience hook for accessing the current theme.
 *
 * Reads from ThemeContext and throws a clear error if called outside of a
 * ThemeProvider — this catches accidental renders in storybook or test
 * harnesses that forget to wrap with the provider.
 */

import { useContext } from 'react';
import { ThemeContext, Theme } from './ThemeProvider';

/**
 * Retrieve the active {@link Theme} from React context.
 *
 * @returns The current theme object containing colors, spacing, typography,
 *          shadows, transitions, color mode, and a toggle function.
 * @throws {Error} If called outside of a `<ThemeProvider>`.
 */
export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
}
