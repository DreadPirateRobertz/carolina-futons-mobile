/**
 * TDD tests for AccountScreen referral section — cm-z0x.
 *
 * Covers:
 * - Referral card renders with code, credits, share button
 * - Share button calls Share.share with correct URL
 * - Error states: loading, no code yet, API failure
 * - Unauthenticated: referral section hidden or shows sign-in prompt
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import { AccountScreen } from '../AccountScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { getEventBuffer, clearEventBuffer } from '@/services/analytics';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockUseReferral = jest.fn();
jest.mock('@/hooks/useReferral', () => ({
  useReferral: () => mockUseReferral(),
}));

const mockUseLoyalty = jest.fn();
jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockUseLoyalty(),
}));

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
  AuthContext: { Consumer: ({ children }: any) => children(null) },
}));

jest.mock('@/hooks/usePremium', () => ({
  usePremium: () => ({ isPremium: false, restore: jest.fn() }),
}));
jest.mock('@/hooks/useAccountDeletion', () => ({
  useAccountDeletion: () => ({ status: 'idle', requestDeletion: jest.fn(), cancel: jest.fn() }),
}));
jest.mock('@/hooks/useDataExport', () => ({
  useDataExport: () => ({ exporting: false, exportData: jest.fn() }),
}));
jest.mock('@/hooks/useAddressBook', () => ({
  useAddressBook: () => ({
    addresses: [],
    add: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    setDefault: jest.fn(),
    saving: false,
  }),
}));
jest.mock('@/hooks/useBiometricAuth', () => ({
  useBiometricAuth: () => ({
    status: 'unavailable',
    isEnabled: false,
    loading: false,
    enableBiometric: jest.fn(),
    disableBiometric: jest.fn(),
  }),
}));
jest.mock('@/services/wix/wixAuth', () => ({
  WixAuthService: jest.fn().mockImplementation(() => ({ syncMemberAddresses: jest.fn() })),
}));
jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '100',
}));
jest.mock('expo-constants', () => ({ default: { expoConfig: { version: '1.0.0' } } }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

const mockShareShare = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });

// ── Fixtures ──────────────────────────────────────────────────────────────────

const AUTH_USER = {
  id: 'member-1',
  email: 'test@example.com',
  displayName: 'Test User',
  phone: '',
  provider: 'wix' as const,
};

const REFERRAL_LOADED = {
  code: 'FUTON-XK7P',
  creditsEarned: 40,
  referralCount: 2,
  shareUrl: 'https://carolinafutons.com/referral/FUTON-XK7P',
  loading: false,
  error: null,
  referredByCode: null,
  storeReferredByCode: jest.fn(),
};

const REFERRAL_LOADING = { ...REFERRAL_LOADED, code: null, loading: true };
const REFERRAL_NO_CODE = {
  ...REFERRAL_LOADED,
  code: null,
  shareUrl: null,
  error: 'Referral code not available yet',
};
const REFERRAL_API_ERROR = {
  ...REFERRAL_LOADED,
  code: null,
  shareUrl: null,
  error: 'Network error',
};

function renderAccountScreen() {
  return render(
    <ThemeProvider>
      <AccountScreen />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  clearEventBuffer();
  mockUseAuth.mockReturnValue({
    user: AUTH_USER,
    isAuthenticated: true,
    loading: false,
    error: null,
    signOut: jest.fn(),
    updateProfile: jest.fn(),
    clearError: jest.fn(),
  });
  mockUseReferral.mockReturnValue(REFERRAL_LOADED);
  mockUseLoyalty.mockReturnValue({
    points: 250,
    tier: 'bronze',
    totalEarned: 250,
    transactions: [],
    loading: false,
    error: null,
    refreshPoints: jest.fn(),
  });
});

// ── Section 1: Referral card rendering ────────────────────────────────────────

describe('referral section — authenticated with code', () => {
  it('renders referral section', () => {
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('account-referral-section')).toBeTruthy();
  });

  it('displays the referral code', () => {
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('account-referral-code').props.children).toContain('FUTON-XK7P');
  });

  it('displays credits earned', () => {
    const { getByTestId } = renderAccountScreen();
    const children = getByTestId('account-referral-credits').props.children;
    // Rendered as ['$', 40] — two separate text nodes
    expect(JSON.stringify(children)).toContain('40');
  });

  it('displays referral count', () => {
    const { getByTestId } = renderAccountScreen();
    const countEl = getByTestId('account-referral-count');
    expect(countEl.props.children).toEqual(expect.arrayContaining([expect.anything(), 2]));
  });

  it('renders share button', () => {
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('account-referral-share-btn')).toBeTruthy();
  });
});

// ── Section 2: Share button ───────────────────────────────────────────────────

describe('share button', () => {
  it('calls Share.share with referral URL when pressed', async () => {
    const { getByTestId } = renderAccountScreen();
    fireEvent.press(getByTestId('account-referral-share-btn'));
    await waitFor(() => expect(mockShareShare).toHaveBeenCalled());
    const call = mockShareShare.mock.calls[0][0];
    expect(call.message ?? call.url).toContain('FUTON-XK7P');
  });

  it('share message includes the referral URL', async () => {
    const { getByTestId } = renderAccountScreen();
    fireEvent.press(getByTestId('account-referral-share-btn'));
    await waitFor(() => expect(mockShareShare).toHaveBeenCalled());
    const call = mockShareShare.mock.calls[0][0];
    expect(JSON.stringify(call)).toContain('carolinafutons.com/referral/FUTON-XK7P');
  });

  it('fires gamification_referral_shared event with referral code', async () => {
    const { getByTestId } = renderAccountScreen();
    fireEvent.press(getByTestId('account-referral-share-btn'));
    await waitFor(() => expect(mockShareShare).toHaveBeenCalled());
    const ev = getEventBuffer().find((e) => e.name === 'gamification_referral_shared');
    expect(ev).toBeDefined();
    expect(ev?.properties?.referral_code).toBe('FUTON-XK7P');
  });

  it('does not fire gamification_referral_shared when share fails', async () => {
    mockShareShare.mockRejectedValueOnce(new Error('cancelled'));
    const { getByTestId } = renderAccountScreen();
    fireEvent.press(getByTestId('account-referral-share-btn'));
    await waitFor(() => expect(mockShareShare).toHaveBeenCalled());
    const ev = getEventBuffer().find((e) => e.name === 'gamification_referral_shared');
    expect(ev).toBeUndefined();
  });
});

// ── Section 3: Loading state ──────────────────────────────────────────────────

describe('referral loading state', () => {
  beforeEach(() => {
    mockUseReferral.mockReturnValue(REFERRAL_LOADING);
  });

  it('shows loading indicator while fetching', () => {
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('account-referral-loading')).toBeTruthy();
  });
});

// ── Section 4: No code yet ────────────────────────────────────────────────────

describe('no referral code yet', () => {
  beforeEach(() => {
    mockUseReferral.mockReturnValue(REFERRAL_NO_CODE);
  });

  it('shows not-available message', () => {
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('account-referral-error')).toBeTruthy();
  });

  it('does not render share button when no code', () => {
    const { queryByTestId } = renderAccountScreen();
    expect(queryByTestId('account-referral-share-btn')).toBeNull();
  });
});

// ── Section 5: API failure ────────────────────────────────────────────────────

describe('API failure', () => {
  beforeEach(() => {
    mockUseReferral.mockReturnValue(REFERRAL_API_ERROR);
  });

  it('shows error message', () => {
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('account-referral-error')).toBeTruthy();
  });
});

// ── Section 6: Unauthenticated ─────────────────────────────────────────────────

describe('unauthenticated', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      clearError: jest.fn(),
    });
  });

  it('does not render referral section when logged out', () => {
    const { queryByTestId } = renderAccountScreen();
    expect(queryByTestId('account-referral-section')).toBeNull();
  });
});
