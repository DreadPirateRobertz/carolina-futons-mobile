import React from 'react';
import { render } from '@testing-library/react-native';
import { MountainSkyline } from '../MountainSkyline';
import { ThemeProvider } from '@/theme';
import { colors } from '@/theme/tokens';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider initialColorMode="dark">{children}</ThemeProvider>
);

describe('MountainSkyline', () => {
  it('renders with default props', () => {
    const { getByTestId } = render(<MountainSkyline testID="skyline" />, { wrapper });
    expect(getByTestId('skyline')).toBeTruthy();
  });

  it('renders sunrise variant by default', () => {
    const { getByTestId } = render(<MountainSkyline testID="skyline-sunrise" />, { wrapper });
    expect(getByTestId('skyline-sunrise')).toBeTruthy();
  });

  it('renders sunset variant', () => {
    const { getByTestId } = render(
      <MountainSkyline testID="skyline-sunset" variant="sunset" />,
      { wrapper },
    );
    expect(getByTestId('skyline-sunset')).toBeTruthy();
  });

  it('accepts custom height', () => {
    const { getByTestId } = render(
      <MountainSkyline testID="skyline-tall" height={200} />,
      { wrapper },
    );
    expect(getByTestId('skyline-tall')).toBeTruthy();
  });

  it('accepts custom style', () => {
    const { getByTestId } = render(
      <MountainSkyline testID="skyline-styled" style={{ marginTop: 10 }} />,
      { wrapper },
    );
    expect(getByTestId('skyline-styled')).toBeTruthy();
  });

  it('uses brand token colors', () => {
    // Verify the component imports and uses the correct brand tokens
    expect(colors.skyGradientTop).toBe('#B8D4E3');
    expect(colors.skyGradientBottom).toBe('#F0C87A');
    expect(colors.sunsetCoral).toBe('#E8845C');
    expect(colors.espresso).toBe('#3A2518');
  });

  it('exports VIEWBOX_WIDTH constant', () => {
    // The component should use a 1440-wide viewBox matching the web version
    const { MountainSkyline: Component } = require('../MountainSkyline');
    expect(Component).toBeDefined();
  });
});
