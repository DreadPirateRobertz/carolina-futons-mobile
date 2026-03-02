import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useTheme } from '../src/theme/useTheme';

// Mock useColorScheme
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

function ThemeConsumer({ testID }: { testID?: string }) {
  const theme = useTheme();
  return (
    <>
      <Text testID="color-mode">{theme.colorMode}</Text>
      <Text testID="is-dark">{String(theme.isDark)}</Text>
      <Text testID="sand-base">{theme.colors.sandBase}</Text>
      <Text testID="espresso">{theme.colors.espresso}</Text>
      <Text testID="mountain-blue">{theme.colors.mountainBlue}</Text>
      <Text testID="offwhite">{theme.colors.offWhite}</Text>
      <Text testID="success">{theme.colors.success}</Text>
      <Text testID="shadow-color">{theme.shadows.card.shadowColor}</Text>
      <Text testID="toggle" onPress={theme.toggleColorMode}>
        toggle
      </Text>
    </>
  );
}

describe('ThemeProvider', () => {
  it('defaults to dark mode', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(getByTestId('color-mode').props.children).toBe('dark');
    expect(getByTestId('is-dark').props.children).toBe('true');
  });

  it('provides light colors when initialColorMode=light', () => {
    const { getByTestId } = render(
      <ThemeProvider initialColorMode="light">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(getByTestId('sand-base').props.children).toBe('#E8D5B7');
    expect(getByTestId('espresso').props.children).toBe('#3A2518');
    expect(getByTestId('is-dark').props.children).toBe('false');
  });

  it('supports initialColorMode=dark', () => {
    const { getByTestId } = render(
      <ThemeProvider initialColorMode="dark">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(getByTestId('color-mode').props.children).toBe('dark');
    expect(getByTestId('is-dark').props.children).toBe('true');
  });

  it('provides dark colors in dark mode using darkPalette', () => {
    const { getByTestId } = render(
      <ThemeProvider initialColorMode="dark">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    // sandBase maps to darkPalette.background
    expect(getByTestId('sand-base').props.children).toBe('#1C1410');
    // espresso maps to darkPalette.textPrimary
    expect(getByTestId('espresso').props.children).toBe('#F5F0EB');
  });

  it('overrides all semantic colors in dark mode', () => {
    const { getByTestId } = render(
      <ThemeProvider initialColorMode="dark">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    // Mountain blue should be different from light mode
    expect(getByTestId('mountain-blue').props.children).toBe('#6FA3BA');
    // offWhite maps to darkPalette.surface
    expect(getByTestId('offwhite').props.children).toBe('#2A1F19');
    expect(getByTestId('success').props.children).toBe('#5A9C6D');
  });

  it('uses dark shadows in dark mode', () => {
    const { getByTestId } = render(
      <ThemeProvider initialColorMode="dark">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(getByTestId('shadow-color').props.children).toBe('#000000');
  });

  it('uses espresso-tinted shadows in light mode', () => {
    const { getByTestId } = render(
      <ThemeProvider initialColorMode="light">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(getByTestId('shadow-color').props.children).toBe('#3A2518');
  });

  it('toggles between dark and light mode', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    // Default is dark
    expect(getByTestId('color-mode').props.children).toBe('dark');
    expect(getByTestId('sand-base').props.children).toBe('#1C1410');
    // Toggle to light
    fireEvent.press(getByTestId('toggle'));
    expect(getByTestId('color-mode').props.children).toBe('light');
    expect(getByTestId('sand-base').props.children).toBe('#E8D5B7');
    // Toggle back to dark
    fireEvent.press(getByTestId('toggle'));
    expect(getByTestId('color-mode').props.children).toBe('dark');
    expect(getByTestId('sand-base').props.children).toBe('#1C1410');
  });
});
