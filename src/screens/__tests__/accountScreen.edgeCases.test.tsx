/**
 * AccountScreen edge-case tests — cm-csx
 *
 * Covers gaps in:
 *  - accountScreen.test.tsx
 *  - accountScreen.skeleton.test.tsx
 *  - accountScreenLoyalty.test.tsx
 *  - accountScreenReferral.test.tsx
 *
 * New coverage:
 *  - Loyalty tier display: loading state, mid-tier boundary points (999, 1499, 2999, 3000)
 *  - Referral flow: zero credits/count state, null shareUrl guard
 *  - Settings navigation: Leaderboard menu item (untested gap)
 *  - Saved addresses: onSavedAddresses delegation vs inline add form
 *  - Edit form: auth.error message display, save loading spinner
 *  - Empty/zero states: share-earn section visibility, sign-in a11y
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Share } from 'react-native';
import { AccountScreen } from '../AccountScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ─── Hook mocks ───────────────────────────────────────────────────────────────

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
  AuthContext: { Consumer: ({ children }: any) => children(null) },
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseLoyalty = jest.fn();
jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockUseLoyalty(),
}));

const mockUseStreak = jest.fn();
jest.mock('@/hooks/useStreak', () => ({
  useStreak: () => mockUseStreak(),
}));

const mockUseReferral = jest.fn();
jest.mock('@/hooks/useReferral', () => ({
  useReferral: () => mockUseReferral(),
}));

jest.mock('@/hooks/usePremium', () => ({
  usePremium: () => ({ isPremium: false, restore: jest.fn() }),
}));

jest.mock('@/hooks/useAccountDeletion', () => ({
  useAccountDeletion: () => ({
    status: 'idle',
    error: null,
    requestDeletion: jest.fn(),
    confirmDeletion: jest.fn(),
    cancel: jest.fn(),
  }),
}));

jest.mock('@/hooks/useDataExport', () => ({
  useDataExport: () => ({ status: 'idle', error: null, exportData: jest.fn() }),
}));

jest.mock('@/hooks/useAddressBook', () => ({
  useAddressBook: () => ({
    addresses: [],
    defaultAddress: null,
    loading: false,
    addAddress: jest.fn(),
    updateAddress: jest.fn(),
    deleteAddress: jest.fn(),
    setDefault: jest.fn(),
    saveFromCheckout: jest.fn(),
  }),
}));

const mockUseSavedAddresses = jest.fn();
jest.mock('@/hooks/useSavedAddresses', () => ({
  useSavedAddresses: () => mockUseSavedAddresses(),
}));

jest.mock('@/hooks/useBiometricAuth', () => ({
  useBiometricAuth: () => ({
    status: { isAvailable: false, isEnrolled: false, biometricType: 'none' },
    isEnabled: false,
    loading: false,
    authenticating: false,
    enableBiometric: jest.fn(),
    disableBiometric: jest.fn(),
    promptBiometric: jest.fn(),
  }),
}));

jest.mock('@/hooks/useGamificationEvents', () => ({
  useGamificationEvents: () => ({
    referralShared: jest.fn(),
    arUsed: jest.fn(),
    addToCart: jest.fn(),
    submitReview: jest.fn(),
    wishlistAdd: jest.fn(),
    badgeEarned: jest.fn(),
    tierChanged: jest.fn(),
    streakExtended: jest.fn(),
  }),
}));

jest.mock('@/services/wix/wixProvider', () => ({
  useWixClient: () => ({ callFunction: jest.fn().mockResolvedValue(null) }),
  useOptionalWixClient: () => null,
}));

jest.mock('@/services/wix/wixAuth', () => ({
  WixAuthService: jest.fn().mockImplementation(() => ({ syncMemberAddresses: jest.fn() })),
}));

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '2.0.0',
  nativeBuildVersion: '100',
  applicationId: 'com.carolinafutons.app',
}));

jest.mock('expo-constants', () => ({ default: { expoConfig: { version: '2.0.0' } } }));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AUTH_USER = {
  id: 'u1',
  email: 'test@example.com',
  displayName: 'Test User',
  phone: '555-1234',
  provider: 'wix' as const,
};

const loyaltyBase = {
  tier: 'bronze',
  totalEarned: 0,
  transactions: [],
  loading: false,
  error: null,
  refreshPoints: jest.fn(),
};

const referralLoaded = {
  code: 'FUTON-ABC1',
  creditsEarned: 20,
  referralCount: 1,
  shareUrl: 'https://carolinafutons.com/referral/FUTON-ABC1',
  loading: false,
  error: null,
  referredByCode: null,
  referrals: [],
  storeReferredByCode: jest.fn(),
  submitReferral: jest.fn(),
};

const emptyAddressBook = {
  addresses: [],
  defaultAddress: null,
  loading: false,
  addAddress: jest.fn(),
  updateAddress: jest.fn(),
  deleteAddress: jest.fn(),
  setDefault: jest.fn(),
  saveFromCheckout: jest.fn(),
};

// ─── Share spy ────────────────────────────────────────────────────────────────

const mockShareShare = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderAccountScreen(props: Partial<React.ComponentProps<typeof AccountScreen>> = {}) {
  return render(
    <ThemeProvider>
      <AccountScreen {...props} />
    </ThemeProvider>,
  );
}

// ─── beforeEach ───────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockShareShare.mockResolvedValue({ action: Share.sharedAction });

  mockUseAuth.mockReturnValue({
    user: AUTH_USER,
    isAuthenticated: true,
    loading: false,
    error: null,
    signOut: jest.fn(),
    updateProfile: jest.fn().mockResolvedValue(undefined),
    clearError: jest.fn(),
  });

  mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 250 });
  mockUseStreak.mockReturnValue({
    streak: 0,
    loading: false,
    wasExtendedToday: false,
    longestStreak: 0,
  });
  mockUseReferral.mockReturnValue(referralLoaded);
  mockUseSavedAddresses.mockReturnValue(emptyAddressBook);
});

// ─── Loyalty tier display — loading state and mid-tier boundaries ─────────────

describe('loyalty tier display — loading state and mid-tier boundaries', () => {
  it('shows loading indicator when loyalty data is loading', () => {
    mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 0, loading: true });
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('gam-header-loading')).toBeTruthy();
  });

  it('hides tier badge while loyalty data is loading', () => {
    mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 0, loading: true });
    const { queryByTestId } = renderAccountScreen();
    expect(queryByTestId('loyalty-tier-badge')).toBeNull();
  });

  it('shows Mountain Guide for 999 pts (mid silver tier)', () => {
    mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 999, tier: 'silver', loading: false });
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('loyalty-tier-name').props.children).toBe('Mountain Guide');
  });

  it('shows Mountain Guide for 1499 pts (silver tier upper boundary)', () => {
    mockUseLoyalty.mockReturnValue({
      ...loyaltyBase,
      points: 1499,
      tier: 'silver',
      loading: false,
    });
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('loyalty-tier-name').props.children).toBe('Mountain Guide');
  });

  it('shows Summit Master for 2999 pts (gold tier upper boundary)', () => {
    mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 2999, tier: 'gold', loading: false });
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('loyalty-tier-name').props.children).toBe('Summit Master');
  });

  it('shows Blue Ridge Legend for 3000 pts (legend tier entry)', () => {
    mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 3000, tier: 'gold', loading: false });
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('loyalty-tier-name').props.children).toBe('Blue Ridge Legend');
  });

  it('points balance element contains the points value', () => {
    mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 10000, loading: false });
    const { getByTestId } = renderAccountScreen();
    const pointsEl = getByTestId('loyalty-points-balance');
    expect(JSON.stringify(pointsEl.props.children)).toContain('10');
  });
});

// ─── Referral flow — zero state and shareUrl guard ────────────────────────────

describe('referral flow — zero state and edge guards', () => {
  it('shows $0 when no credits have been earned', () => {
    mockUseReferral.mockReturnValue({ ...referralLoaded, creditsEarned: 0 });
    const { getByTestId } = renderAccountScreen();
    const creditsEl = getByTestId('account-referral-credits');
    expect(JSON.stringify(creditsEl.props.children)).toContain('0');
  });

  it('shows 0 referral count when no referrals made yet', () => {
    mockUseReferral.mockReturnValue({ ...referralLoaded, referralCount: 0 });
    const { getByTestId } = renderAccountScreen();
    const countEl = getByTestId('account-referral-count');
    expect(JSON.stringify(countEl.props.children)).toContain('0');
  });

  it('referral section is visible to authenticated user when loaded without error', () => {
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('account-referral-section')).toBeTruthy();
  });

  it('share button press does not call Share.share when shareUrl is null', async () => {
    mockUseReferral.mockReturnValue({ ...referralLoaded, shareUrl: null });
    const { getByTestId } = renderAccountScreen();
    await act(async () => {
      fireEvent.press(getByTestId('account-referral-share-btn'));
    });
    expect(mockShareShare).not.toHaveBeenCalled();
  });
});

// ─── Leaderboard navigation (untested gap) ────────────────────────────────────

describe('leaderboard navigation', () => {
  it('shows Leaderboard menu item when authenticated', () => {
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('account-leaderboard')).toBeTruthy();
  });

  it('calls onLeaderboard when Leaderboard menu item is pressed', () => {
    const onLeaderboard = jest.fn();
    const { getByTestId } = renderAccountScreen({ onLeaderboard });
    fireEvent.press(getByTestId('account-leaderboard'));
    expect(onLeaderboard).toHaveBeenCalledTimes(1);
  });

  it('pressing Leaderboard without onLeaderboard callback does not throw', () => {
    const { getByTestId } = renderAccountScreen();
    expect(() => fireEvent.press(getByTestId('account-leaderboard'))).not.toThrow();
  });
});

// ─── Saved addresses — onSavedAddresses delegation ───────────────────────────

describe('saved addresses — onSavedAddresses delegation', () => {
  it('calls onSavedAddresses when prop is provided and Addresses row pressed', async () => {
    const onSavedAddresses = jest.fn();
    const { getByTestId } = renderAccountScreen({ onSavedAddresses });
    await act(async () => {
      fireEvent.press(getByTestId('account-addresses'));
    });
    expect(onSavedAddresses).toHaveBeenCalledTimes(1);
  });

  it('opens inline add form when no onSavedAddresses and address count is under limit', async () => {
    const { getByTestId } = renderAccountScreen();
    await act(async () => {
      fireEvent.press(getByTestId('account-addresses'));
    });
    await waitFor(() => expect(getByTestId('address-form')).toBeTruthy());
  });

  it('does not open inline form when onSavedAddresses prop is provided', async () => {
    const onSavedAddresses = jest.fn();
    const { queryByTestId, getByTestId } = renderAccountScreen({ onSavedAddresses });
    await act(async () => {
      fireEvent.press(getByTestId('account-addresses'));
    });
    expect(queryByTestId('address-form')).toBeNull();
  });
});

// ─── Edit form — error display and loading spinner ───────────────────────────

describe('edit form — error display and loading spinner', () => {
  it('shows error message from auth.error when editing', async () => {
    mockUseAuth.mockReturnValue({
      user: AUTH_USER,
      isAuthenticated: true,
      loading: false,
      error: 'Profile update failed',
      signOut: jest.fn(),
      updateProfile: jest.fn().mockResolvedValue(undefined),
      clearError: jest.fn(),
    });
    const { getByTestId } = renderAccountScreen();
    await act(async () => {
      fireEvent.press(getByTestId('edit-profile-button'));
    });
    await waitFor(() => expect(getByTestId('edit-profile-form')).toBeTruthy());
    expect(getByTestId('edit-profile-error').props.children).toBe('Profile update failed');
  });

  it('shows loading spinner on save button while auth is loading', async () => {
    mockUseAuth.mockReturnValue({
      user: AUTH_USER,
      isAuthenticated: true,
      loading: true,
      error: null,
      signOut: jest.fn(),
      updateProfile: jest.fn().mockResolvedValue(undefined),
      clearError: jest.fn(),
    });
    const { getByTestId } = renderAccountScreen();
    await act(async () => {
      fireEvent.press(getByTestId('edit-profile-button'));
    });
    await waitFor(() => expect(getByTestId('edit-profile-form')).toBeTruthy());
    expect(getByTestId('edit-save-loading')).toBeTruthy();
  });
});

// ─── Empty and zero states ────────────────────────────────────────────────────

describe('empty and zero states', () => {
  it('share-earn section renders when user is authenticated', () => {
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('share-earn-section')).toBeTruthy();
  });

  it('share-earn section absent in guest state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      clearError: jest.fn(),
    });
    const { queryByTestId } = renderAccountScreen();
    expect(queryByTestId('share-earn-section')).toBeNull();
  });

  it('sign-in button has accessible role and label for guests', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      clearError: jest.fn(),
    });
    const { getByTestId } = renderAccountScreen();
    const signInBtn = getByTestId('account-sign-in-button');
    expect(signInBtn.props.accessibilityRole).toBe('button');
    expect(signInBtn.props.accessibilityLabel).toBe('Sign in to your account');
  });

  it('avatar initial is the uppercase first character of the user display name', () => {
    const { getByText } = renderAccountScreen();
    expect(getByText('T')).toBeTruthy(); // 'T' from 'Test User'
  });

  it('avatar accessibility label includes user display name', () => {
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('user-avatar').props.accessibilityLabel).toContain('Test User');
  });
});
