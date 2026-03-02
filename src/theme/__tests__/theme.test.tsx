import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../ThemeProvider';
import { useTheme } from '../useTheme';
import { colors, spacing, borderRadius, shadows, typography, transitions } from '../tokens';

function ThemeConsumer() {
  const theme = useTheme();
  return (
    <>
      <Text testID="bg-color">{theme.colors.sandBase}</Text>
      <Text testID="color-mode">{theme.colorMode}</Text>
      <Text testID="spacing-md">{theme.spacing.md}</Text>
      <Text testID="toggle" onPress={theme.toggleColorMode}>
        toggle
      </Text>
    </>
  );
}

describe('Design Tokens', () => {
  it('exports all Blue Ridge Mountain colors', () => {
    expect(colors.sandBase).toBe('#E8D5B7');
    expect(colors.espresso).toBe('#3A2518');
    expect(colors.mountainBlue).toBe('#5B8FA8');
    expect(colors.sunsetCoral).toBe('#E8845C');
    expect(colors.mauve).toBe('#C9A0A0');
    expect(colors.success).toBe('#4A7C59');
    expect(colors.overlay).toBe('rgba(58, 37, 24, 0.6)');
    expect(colors.mutedBrown).toBe('#8B7355');
  });

  it('exports 4px grid spacing', () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(16);
    expect(spacing.lg).toBe(24);
    expect(spacing.xl).toBe(32);
  });

  it('exports border radii', () => {
    expect(borderRadius.card).toBe(12);
    expect(borderRadius.button).toBe(8);
    expect(borderRadius.pill).toBe(9999);
  });

  it('exports shadows with espresso tint', () => {
    expect(shadows.card.shadowColor).toBe('#3A2518');
    expect(shadows.button.shadowColor).toBe('#E8845C');
  });

  it('exports typography scale with font families', () => {
    expect(typography.headingFamily).toBe('PlayfairDisplay_700Bold');
    expect(typography.bodyFamily).toBe('SourceSans3_400Regular');
    expect(typography.h1.fontSize).toBe(34);
    expect(typography.body.fontSize).toBe(15);
  });

  it('exports transition configs with duration and easing', () => {
    expect(transitions.fast.duration).toBe(150);
    expect(transitions.medium.duration).toBe(250);
    expect(typeof transitions.fast.easing).toBe('function');
  });
});

describe('ThemeProvider', () => {
  it('provides light theme by default', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(getByTestId('bg-color').props.children).toBe('#E8D5B7');
    expect(getByTestId('color-mode').props.children).toBe('light');
  });

  it('provides spacing through context', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(getByTestId('spacing-md').props.children).toBe(16);
  });

  it('toggles between light and dark mode', () => {
    const { getByTestId } = render(
      <ThemeProvider initialColorMode="light">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(getByTestId('color-mode').props.children).toBe('light');
    fireEvent.press(getByTestId('toggle'));
    expect(getByTestId('color-mode').props.children).toBe('dark');
  });

  it('uses dark colors in dark mode', () => {
    const { getByTestId } = render(
      <ThemeProvider initialColorMode="dark">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(getByTestId('bg-color').props.children).toBe('#1A1410');
  });
});

describe('useTheme', () => {
  it('throws when used outside ThemeProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeConsumer />)).toThrow('useTheme must be used within a ThemeProvider');
    consoleError.mockRestore();
  });
});
