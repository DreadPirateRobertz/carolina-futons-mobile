/**
 * Tests for ReferralLandingScreen — cm-z0x + cm-lnd.
 *
 * Covers:
 * - Renders welcome UI
 * - Calls storeReferredByCode with route param code on mount
 * - Does NOT auto-navigate — waits for CTA press
 * - CTA button renders and navigates to Tabs on press
 * - Shows discount offer copy
 * - Accessibility
 */
import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { ReferralLandingScreen } from '../ReferralLandingScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockStoreReferredByCode = jest.fn().mockResolvedValue(undefined);
const mockUseReferral = jest.fn(() => ({
  storeReferredByCode: mockStoreReferredByCode,
  code: null,
  creditsEarned: 0,
  referralCount: 0,
  shareUrl: null,
  loading: false,
  error: null,
  referredByCode: null,
}));
jest.mock('@/hooks/useReferral', () => ({
  useReferral: () => mockUseReferral(),
}));

const mockNavigationReset = jest.fn();
const mockNavigation = { reset: mockNavigationReset } as any;

function makeRoute(code: string) {
  return { params: { code } } as any;
}

function renderScreen(code = 'FUTON-XK7P') {
  return render(
    <ThemeProvider>
      <ReferralLandingScreen route={makeRoute(code)} navigation={mockNavigation} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStoreReferredByCode.mockResolvedValue(undefined);
});

// ── Section 1: Static rendering ───────────────────────────────────────────────

describe('ReferralLandingScreen — rendering', () => {
  it('renders the welcome title', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('referral-landing-title')).toBeTruthy();
  });

  it('renders the referral landing container', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('referral-landing')).toBeTruthy();
  });

  it('renders the CTA button', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('referral-landing-cta')).toBeTruthy();
  });

  it('shows discount offer copy', () => {
    const { getByTestId } = renderScreen();
    const discount = getByTestId('referral-landing-discount');
    expect(discount).toBeTruthy();
  });
});

// ── Section 2: Mount behaviour ────────────────────────────────────────────────

describe('ReferralLandingScreen — mount behaviour', () => {
  it('calls storeReferredByCode with the route code on mount', async () => {
    renderScreen('FUTON-XK7P');
    await waitFor(() => expect(mockStoreReferredByCode).toHaveBeenCalledWith('FUTON-XK7P'));
  });

  it('calls storeReferredByCode with a different code', async () => {
    renderScreen('SALE-ABCD');
    await waitFor(() => expect(mockStoreReferredByCode).toHaveBeenCalledWith('SALE-ABCD'));
  });

  it('does NOT auto-navigate before CTA is pressed', async () => {
    renderScreen('FUTON-XK7P');
    // Let the async storeReferredByCode settle
    await waitFor(() => expect(mockStoreReferredByCode).toHaveBeenCalled());
    expect(mockNavigationReset).not.toHaveBeenCalled();
  });
});

// ── Section 3: CTA navigation ─────────────────────────────────────────────────

describe('ReferralLandingScreen — CTA navigation', () => {
  it('navigates to Tabs when CTA is pressed', async () => {
    const { getByTestId } = renderScreen('FUTON-XK7P');
    await waitFor(() => expect(mockStoreReferredByCode).toHaveBeenCalled());

    fireEvent.press(getByTestId('referral-landing-cta'));

    expect(mockNavigationReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Tabs' }],
    });
  });

  it('navigates immediately if CTA pressed before store settles', () => {
    // storeReferredByCode is still pending — CTA should still work
    mockStoreReferredByCode.mockReturnValue(new Promise(() => {})); // never resolves
    const { getByTestId } = renderScreen('FUTON-XK7P');
    fireEvent.press(getByTestId('referral-landing-cta'));
    expect(mockNavigationReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Tabs' }],
    });
  });
});

// ── Section 4: Accessibility ──────────────────────────────────────────────────

describe('ReferralLandingScreen — accessibility', () => {
  it('CTA button has accessibilityRole="button"', () => {
    const { getByTestId } = renderScreen();
    const cta = getByTestId('referral-landing-cta');
    expect(cta.props.accessibilityRole).toBe('button');
  });

  it('CTA button has an accessibilityLabel', () => {
    const { getByTestId } = renderScreen();
    const cta = getByTestId('referral-landing-cta');
    expect(cta.props.accessibilityLabel).toBeTruthy();
  });
});
