/**
 * Tests for ReferralLandingScreen — cm-z0x / cm-2iw.
 *
 * Covers:
 * - Renders welcome UI
 * - Calls storeReferredByCode with route param code
 * - Navigates to Tabs after storing code
 * - Ignores empty/invalid code (edge case)
 * - Graceful error handling, subtitle, spinner, boundary values
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

  // ── Edge cases (cm-2iw) ───────────────────────────────────────────────────

  describe('graceful error handling', () => {
    it('still navigates to Tabs even when storeReferredByCode throws', async () => {
      mockStoreReferredByCode.mockRejectedValueOnce(new Error('AsyncStorage unavailable'));
      renderScreen('FUTON-ERR1');
      await waitFor(() =>
        expect(mockNavigationReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: 'Tabs' }],
        }),
      );
    });

    it('calls storeReferredByCode exactly once even when it throws', async () => {
      mockStoreReferredByCode.mockRejectedValueOnce(new Error('fail'));
      renderScreen('CODE-X');
      await waitFor(() => expect(mockStoreReferredByCode).toHaveBeenCalledTimes(1));
    });
  });

  describe('welcome UI elements', () => {
    it('renders the subtitle / instructions text', () => {
      const { getByText } = renderScreen();
      expect(
        getByText(/sign in or create an account to redeem your discount/i),
      ).toBeTruthy();
    });

    it('renders an ActivityIndicator spinner', () => {
      const { UNSAFE_getByType } = renderScreen();
      const { ActivityIndicator } = require('react-native');
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });
  });

  describe('boundary: empty code', () => {
    it('calls storeReferredByCode with empty string and still navigates', async () => {
      renderScreen('');
      await waitFor(() => expect(mockStoreReferredByCode).toHaveBeenCalledWith(''));
      await waitFor(() => expect(mockNavigationReset).toHaveBeenCalled());
    });
  });

  describe('boundary: code with special characters', () => {
    it('passes code with hyphens and digits unchanged', async () => {
      renderScreen('REF-2026-XK7P');
      await waitFor(() =>
        expect(mockStoreReferredByCode).toHaveBeenCalledWith('REF-2026-XK7P'),
      );
    });
  });
});
