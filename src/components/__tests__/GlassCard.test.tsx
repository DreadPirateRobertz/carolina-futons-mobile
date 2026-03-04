import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { GlassCard } from '../GlassCard';
import { ThemeProvider } from '@/theme';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider initialColorMode="dark">{children}</ThemeProvider>
);

describe('GlassCard', () => {
  it('renders children', () => {
    const { getByText } = render(
      <GlassCard>
        <Text>Hello</Text>
      </GlassCard>,
      { wrapper },
    );
    expect(getByText('Hello')).toBeTruthy();
  });

  it('accepts testID prop', () => {
    const { getByTestId } = render(
      <GlassCard testID="glass">
        <Text>Content</Text>
      </GlassCard>,
      { wrapper },
    );
    expect(getByTestId('glass')).toBeTruthy();
  });

  it('accepts custom style', () => {
    const { getByTestId } = render(
      <GlassCard testID="styled" style={{ padding: 20 }}>
        <Text>Styled</Text>
      </GlassCard>,
      { wrapper },
    );
    expect(getByTestId('styled')).toBeTruthy();
  });

  it('supports intensity variants', () => {
    const { getByTestId: getLight } = render(
      <GlassCard testID="light-glass" intensity="light">
        <Text>Light</Text>
      </GlassCard>,
      { wrapper },
    );
    expect(getLight('light-glass')).toBeTruthy();

    const { getByTestId: getHeavy } = render(
      <GlassCard testID="heavy-glass" intensity="heavy">
        <Text>Heavy</Text>
      </GlassCard>,
      { wrapper },
    );
    expect(getHeavy('heavy-glass')).toBeTruthy();
  });
});
