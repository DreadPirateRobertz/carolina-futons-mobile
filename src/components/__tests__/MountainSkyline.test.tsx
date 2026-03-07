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
    const { getByTestId } = render(<MountainSkyline testID="skyline-sunset" variant="sunset" />, {
      wrapper,
    });
    expect(getByTestId('skyline-sunset')).toBeTruthy();
  });

  it('accepts custom height', () => {
    const { getByTestId } = render(<MountainSkyline testID="skyline-tall" height={200} />, {
      wrapper,
    });
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
    expect(colors.skyGradientTop).toBe('#B8D4E3');
    expect(colors.skyGradientBottom).toBe('#F0C87A');
    expect(colors.sunsetCoral).toBe('#E8845C');
    expect(colors.espresso).toBe('#3A2518');
  });

  it('renders 7 mountain layers', () => {
    const { toJSON } = render(<MountainSkyline testID="skyline-layers" />, { wrapper });
    const json = JSON.stringify(toJSON());
    // Count Path elements — should have 7 mountain layers
    const paths = json.match(/"type":"Path"/g) || [];
    expect(paths.length).toBeGreaterThanOrEqual(7);
  });

  it('renders bird detail elements by default', () => {
    const { toJSON } = render(<MountainSkyline testID="skyline-birds" />, { wrapper });
    const json = JSON.stringify(toJSON());
    // Birds use stroke paths with fill="none"
    expect(json).toContain('"fill":"none"');
  });

  it('renders transparent variant', () => {
    const { getByTestId } = render(<MountainSkyline testID="skyline-transparent" transparent />, {
      wrapper,
    });
    expect(getByTestId('skyline-transparent')).toBeTruthy();
  });

  it('accepts showDetails prop', () => {
    const { getByTestId } = render(<MountainSkyline testID="skyline-details" showDetails />, {
      wrapper,
    });
    expect(getByTestId('skyline-details')).toBeTruthy();
  });

  it('hides details when showDetails is false', () => {
    const { toJSON } = render(<MountainSkyline testID="skyline-no-details" showDetails={false} />, {
      wrapper,
    });
    const json = JSON.stringify(toJSON());
    // Should NOT have bird paths (fill="none" strokes)
    expect(json).not.toContain('"fill":"none"');
  });
});
