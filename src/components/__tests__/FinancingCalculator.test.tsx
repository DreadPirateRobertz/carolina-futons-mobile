/**
 * Tests for FinancingCalculator — display-only Affirm/Afterpay panel on PDP.
 * TDD — written before implementation.
 *
 * Bead: cfutons_mobile-lub
 */
import { render, fireEvent } from '@testing-library/react-native';
import { FinancingCalculator } from '../FinancingCalculator';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#3B2A20',
      espressoLight: '#6B5B4F',
      mountainBlue: '#5B8FA8',
      sandLight: '#F5ECD7',
      white: '#FFFFFF',
      sunsetCoral: '#E8845C',
      overlay: 'rgba(0,0,0,0.4)',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
    borderRadius: { sm: 4, md: 8, lg: 16, pill: 999 },
    shadows: {},
  }),
}));

describe('FinancingCalculator', () => {
  describe('eligibility gating', () => {
    it('renders for $40 (Afterpay eligible ≥$35, Affirm not shown)', () => {
      const { getByTestId } = render(<FinancingCalculator price={40} testID="fin-calc" />);
      expect(getByTestId('fin-calc')).toBeTruthy();
    });

    it('renders nothing for price of $0', () => {
      const { toJSON } = render(<FinancingCalculator price={0} />);
      expect(toJSON()).toBeNull();
    });

    it('renders nothing for $34 — below both Afterpay min ($35) and Affirm min ($200)', () => {
      const { toJSON } = render(<FinancingCalculator price={34} />);
      expect(toJSON()).toBeNull();
    });

    it('renders for Affirm eligible price ($200, 6-month plan min)', () => {
      const { getByTestId } = render(<FinancingCalculator price={200} testID="fin-calc" />);
      expect(getByTestId('fin-calc')).toBeTruthy();
    });

    it('renders for high price ($1500)', () => {
      const { getByTestId } = render(<FinancingCalculator price={1500} testID="fin-calc" />);
      expect(getByTestId('fin-calc')).toBeTruthy();
    });
  });

  describe('provider tabs', () => {
    it('renders Affirm tab', () => {
      const { getByTestId } = render(<FinancingCalculator price={500} />);
      expect(getByTestId('fin-tab-affirm')).toBeTruthy();
    });

    it('renders Afterpay tab', () => {
      const { getByTestId } = render(<FinancingCalculator price={500} />);
      expect(getByTestId('fin-tab-afterpay')).toBeTruthy();
    });

    it('Affirm tab is selected by default', () => {
      const { getByTestId } = render(<FinancingCalculator price={500} />);
      expect(getByTestId('fin-tab-affirm').props.accessibilityState?.selected).toBe(true);
      expect(getByTestId('fin-tab-afterpay').props.accessibilityState?.selected).toBe(false);
    });

    it('switching to Afterpay tab updates selection state', () => {
      const { getByTestId } = render(<FinancingCalculator price={500} />);
      fireEvent.press(getByTestId('fin-tab-afterpay'));
      expect(getByTestId('fin-tab-afterpay').props.accessibilityState?.selected).toBe(true);
      expect(getByTestId('fin-tab-affirm').props.accessibilityState?.selected).toBe(false);
    });

    it('switching back to Affirm tab works', () => {
      const { getByTestId } = render(<FinancingCalculator price={500} />);
      fireEvent.press(getByTestId('fin-tab-afterpay'));
      fireEvent.press(getByTestId('fin-tab-affirm'));
      expect(getByTestId('fin-tab-affirm').props.accessibilityState?.selected).toBe(true);
    });
  });

  describe('Affirm panel', () => {
    it('shows 6-month, 12-month, 24-month term rows for $600', () => {
      // $600: qualifies for 6mo (min $200) + 12mo (min $500) + 24mo (min $500); not 18mo (min $750)
      const { getByTestId } = render(<FinancingCalculator price={600} />);
      expect(getByTestId('fin-affirm-term-6')).toBeTruthy();
      expect(getByTestId('fin-affirm-term-12')).toBeTruthy();
      expect(getByTestId('fin-affirm-term-24')).toBeTruthy();
    });

    it('shows all 4 term rows for $750+', () => {
      const { getByTestId } = render(<FinancingCalculator price={800} />);
      expect(getByTestId('fin-affirm-term-6')).toBeTruthy();
      expect(getByTestId('fin-affirm-term-12')).toBeTruthy();
      expect(getByTestId('fin-affirm-term-18')).toBeTruthy();
      expect(getByTestId('fin-affirm-term-24')).toBeTruthy();
    });

    it('each term row shows monthly amount text', () => {
      const { getByTestId } = render(<FinancingCalculator price={600} />);
      const term12 = getByTestId('fin-affirm-term-12-amount');
      expect(String(term12.props.children)).toMatch(/\$/);
    });

    it('shows APR range disclaimer mentioning 0% and 9.99%', () => {
      const { getByText } = render(<FinancingCalculator price={600} />);
      expect(getByText(/0%.*9\.99%/)).toBeTruthy();
    });

    it('shows "Subject to credit approval"', () => {
      const { getByText } = render(<FinancingCalculator price={600} />);
      expect(getByText(/Subject to credit approval/i)).toBeTruthy();
    });

    it('does NOT show a checkout/continue button', () => {
      const { queryByText } = render(<FinancingCalculator price={600} />);
      expect(queryByText(/continue/i)).toBeNull();
      expect(queryByText(/apply now/i)).toBeNull();
      expect(queryByText(/get started/i)).toBeNull();
    });
  });

  describe('Afterpay panel', () => {
    it('shows Afterpay installment rows after switching tab', () => {
      const { getByTestId } = render(<FinancingCalculator price={400} />);
      fireEvent.press(getByTestId('fin-tab-afterpay'));
      expect(getByTestId('fin-afterpay-installment-1')).toBeTruthy();
      expect(getByTestId('fin-afterpay-installment-2')).toBeTruthy();
      expect(getByTestId('fin-afterpay-installment-3')).toBeTruthy();
      expect(getByTestId('fin-afterpay-installment-4')).toBeTruthy();
    });

    it('first installment label is "Today"', () => {
      const { getByTestId } = render(<FinancingCalculator price={400} />);
      fireEvent.press(getByTestId('fin-tab-afterpay'));
      expect(getByTestId('fin-afterpay-installment-1-label').props.children).toBe('Today');
    });

    it('shows "Interest-free" text', () => {
      const { getByTestId } = render(<FinancingCalculator price={400} />);
      fireEvent.press(getByTestId('fin-tab-afterpay'));
      expect(getByTestId('fin-afterpay-tagline')).toBeTruthy();
    });

    it('installment amounts are equal for evenly divisible price', () => {
      // $400 / 4 = $100 each
      const { getByTestId } = render(<FinancingCalculator price={400} />);
      fireEvent.press(getByTestId('fin-tab-afterpay'));
      const amt1 = getByTestId('fin-afterpay-installment-1-amount').props.children;
      const amt2 = getByTestId('fin-afterpay-installment-2-amount').props.children;
      expect(amt1).toBe(amt2);
    });

    it('does NOT show a checkout/continue button', () => {
      const { queryByText, getByTestId } = render(<FinancingCalculator price={400} />);
      fireEvent.press(getByTestId('fin-tab-afterpay'));
      expect(queryByText(/continue/i)).toBeNull();
      expect(queryByText(/apply now/i)).toBeNull();
    });

    it('shows "Pay in 4" description', () => {
      const { getByTestId, getByText } = render(<FinancingCalculator price={400} />);
      fireEvent.press(getByTestId('fin-tab-afterpay'));
      expect(getByText(/pay in 4/i)).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('accepts custom testID', () => {
      const { getByTestId } = render(<FinancingCalculator price={500} testID="my-calc" />);
      expect(getByTestId('my-calc')).toBeTruthy();
    });

    it('renders nothing for negative price', () => {
      const { toJSON } = render(<FinancingCalculator price={-100} />);
      expect(toJSON()).toBeNull();
    });

    it('Afterpay panel hidden above $1,000 but Affirm still shows', () => {
      // $1,500 is above Afterpay max ($1,000) — only Affirm tab should be shown
      const { queryByTestId } = render(<FinancingCalculator price={1500} />);
      expect(queryByTestId('fin-tab-affirm')).toBeTruthy();
      expect(queryByTestId('fin-tab-afterpay')).toBeNull();
    });

    it('renders nothing above $10,000 (no plans eligible)', () => {
      const { toJSON } = render(<FinancingCalculator price={10001} />);
      expect(toJSON()).toBeNull();
    });
  });

  // ── Affirm deep-link tap (hq-8iw) ────────────────────────────────────────

  describe('Affirm deep-link tap', () => {
    it('calls onAffirmPress when Affirm term row is tapped', () => {
      const onAffirmPress = jest.fn();
      const { getByTestId } = render(
        <FinancingCalculator price={500} onAffirmPress={onAffirmPress} />,
      );
      fireEvent.press(getByTestId('fin-affirm-deeplink-cta'));
      expect(onAffirmPress).toHaveBeenCalledTimes(1);
    });

    it('renders Affirm deep-link CTA when onAffirmPress is provided', () => {
      const { getByTestId } = render(
        <FinancingCalculator price={500} onAffirmPress={jest.fn()} />,
      );
      expect(getByTestId('fin-affirm-deeplink-cta')).toBeTruthy();
    });

    it('does NOT render Affirm deep-link CTA when onAffirmPress is not provided', () => {
      const { queryByTestId } = render(<FinancingCalculator price={500} />);
      expect(queryByTestId('fin-affirm-deeplink-cta')).toBeNull();
    });

    it('Affirm deep-link CTA has accessible label', () => {
      const { getByTestId } = render(
        <FinancingCalculator price={500} onAffirmPress={jest.fn()} />,
      );
      const cta = getByTestId('fin-affirm-deeplink-cta');
      expect(cta.props.accessibilityLabel).toMatch(/affirm/i);
    });

    it('does not render deep-link CTA for Afterpay tab', () => {
      const { queryByTestId } = render(
        <FinancingCalculator price={400} onAffirmPress={jest.fn()} />,
      );
      // Switch to Afterpay tab
      fireEvent.press(queryByTestId('fin-tab-afterpay')!);
      expect(queryByTestId('fin-affirm-deeplink-cta')).toBeNull();
    });
  });
});