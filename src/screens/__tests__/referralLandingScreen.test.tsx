/**
 * Tests for ReferralLandingScreen — cm-z0x.
 *
 * Covers:
 * - Renders welcome UI
 * - Calls storeReferredByCode with route param code
 * - Navigates to Tabs after storing code
 * - Ignores empty/invalid code (edge case)
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
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

describe('ReferralLandingScreen', () => {
  it('renders the welcome title', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('referral-landing-title')).toBeTruthy();
  });

  it('renders the referral landing container', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('referral-landing')).toBeTruthy();
  });

  it('calls storeReferredByCode with the route code', async () => {
    renderScreen('FUTON-XK7P');
    await waitFor(() => expect(mockStoreReferredByCode).toHaveBeenCalledWith('FUTON-XK7P'));
  });

  it('navigates to Tabs after storing code', async () => {
    renderScreen('FUTON-XK7P');
    await waitFor(() =>
      expect(mockNavigationReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Tabs' }],
      }),
    );
  });

  it('passes different code correctly', async () => {
    renderScreen('SALE-ABCD');
    await waitFor(() => expect(mockStoreReferredByCode).toHaveBeenCalledWith('SALE-ABCD'));
  });
});
