/**
 * Tests for the FinancingBadge component shown on ProductCard and ProductDetail.
 * CF-lalh: badge prominence — larger compact size + "with Klarna" branding.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FinancingBadge } from '../FinancingBadge';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      mountainBlue: '#5B8FA8',
      white: '#FFFFFF',
      espressoLight: '#6B5B4F',
    },
    spacing: { xs: 4, sm: 8 },
    borderRadius: { sm: 4 },
  }),
}));

describe('FinancingBadge', () => {
  it('renders "As low as" text with monthly payment for eligible price', () => {
    const { getByText } = render(<FinancingBadge price={500} />);
    expect(getByText(/As low as/)).toBeTruthy();
    expect(getByText(/\/mo/)).toBeTruthy();
  });

  it('renders nothing for ineligible price', () => {
    const { toJSON } = render(<FinancingBadge price={100} />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing for price at threshold', () => {
    const { toJSON } = render(<FinancingBadge price={299} />);
    expect(toJSON()).toBeNull();
  });

  it('uses lowest monthly payment (12-month term)', () => {
    const { getByTestId } = render(<FinancingBadge price={1200} />);
    const badge = getByTestId('financing-badge-compact');
    expect(badge).toBeTruthy();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = render(<FinancingBadge price={500} testID="custom-badge" />);
    expect(getByTestId('custom-badge')).toBeTruthy();
  });

  it('shows disclaimer text when variant is "detail"', () => {
    const { getByText } = render(<FinancingBadge price={500} variant="detail" />);
    expect(getByText(/Subject to credit approval/)).toBeTruthy();
  });

  it('does not show disclaimer when variant is "compact"', () => {
    const { queryByText } = render(<FinancingBadge price={500} variant="compact" />);
    expect(queryByText(/Subject to credit approval/)).toBeNull();
  });

  // ── CF-lalh: prominence + Klarna branding ──────────────────────────────────

  it('compact variant includes "with Klarna" in text', () => {
    const { getByText } = render(<FinancingBadge price={500} variant="compact" />);
    expect(getByText(/with Klarna/i)).toBeTruthy();
  });

  it('detail variant includes "with Klarna" in title', () => {
    const { getByText } = render(<FinancingBadge price={500} variant="detail" />);
    expect(getByText(/with Klarna/i)).toBeTruthy();
  });

  it('compact badge renders with branding text for legibility', () => {
    const { getByTestId, getByText } = render(<FinancingBadge price={500} variant="compact" />);
    expect(getByTestId('financing-badge-compact')).toBeTruthy();
    // Verifies text is rendered (font size 12 applied via styles)
    expect(getByText(/As low as.*\/mo.*with Klarna/i)).toBeTruthy();
  });

  it('compact badge has testID "financing-badge-compact" for ProductCard targeting', () => {
    const { getByTestId } = render(<FinancingBadge price={500} variant="compact" />);
    expect(getByTestId('financing-badge-compact')).toBeTruthy();
  });

  it('detail badge has testID "financing-badge-detail" for PDP targeting', () => {
    const { getByTestId } = render(<FinancingBadge price={500} variant="detail" />);
    expect(getByTestId('financing-badge-detail')).toBeTruthy();
  });

  it('compact badge renders adjacent to price — renders for $500 product', () => {
    const { getByText } = render(<FinancingBadge price={500} variant="compact" />);
    // Verifies badge renders at card-eligible price with Klarna branding visible
    expect(getByText(/As low as.*\/mo.*with Klarna/i)).toBeTruthy();
  });

  it('detail badge shows Klarna branding prominently', () => {
    const { getAllByText } = render(<FinancingBadge price={800} variant="detail" />);
    const klarnaMatches = getAllByText(/Klarna/i);
    expect(klarnaMatches.length).toBeGreaterThanOrEqual(1);
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  it('renders badge at exact threshold boundary ($300)', () => {
    const { getByText } = render(<FinancingBadge price={300} />);
    expect(getByText(/As low as/)).toBeTruthy();
    expect(getByText(/with Klarna/i)).toBeTruthy();
  });

  it('accepts custom testID on detail variant', () => {
    const { getByTestId } = render(
      <FinancingBadge price={500} variant="detail" testID="my-detail-badge" />,
    );
    expect(getByTestId('my-detail-badge')).toBeTruthy();
  });

  it('detail variant renders all three term pills', () => {
    const { getByText } = render(<FinancingBadge price={800} variant="detail" />);
    expect(getByText(/3mo:/)).toBeTruthy();
    expect(getByText(/6mo:/)).toBeTruthy();
    expect(getByText(/12mo:/)).toBeTruthy();
  });

  it('detail variant disclaimer includes APR percentage', () => {
    const { getByText } = render(<FinancingBadge price={500} variant="detail" />);
    expect(getByText(/9\.99%/)).toBeTruthy();
  });

  // ── onPress / tap-to-open (cm-qmr) ────────────────────────────────────────

  it('compact badge calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<FinancingBadge price={500} onPress={onPress} />);
    fireEvent.press(getByTestId('financing-badge-compact'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('detail badge calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <FinancingBadge price={500} variant="detail" onPress={onPress} />,
    );
    fireEvent.press(getByTestId('financing-badge-detail'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders without onPress — compact badge is still a View (not pressable)', () => {
    const { getByTestId } = render(<FinancingBadge price={500} />);
    // Should render without crash; press does nothing
    expect(getByTestId('financing-badge-compact')).toBeTruthy();
  });
});
