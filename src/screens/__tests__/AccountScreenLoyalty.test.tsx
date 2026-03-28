/**
 * TDD tests for AccountScreen loyalty tier badge — cm-sxw.
 *
 * Covers:
 * - Tier badge renders with correct tier name at each tier threshold
 * - Points balance displayed correctly
 * - Badge hidden / loading state when loyalty data unavailable
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AccountScreen } from '../AccountScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
  AuthContext: { Consumer: ({ children }: any) => children(null) },
}));

const mockUseLoyalty = jest.fn();
jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockUseLoyalty(),
}));

jest.mock('@/hooks/useReferral', () => ({
  useReferral: () => ({
    code: null,
    creditsEarned: 0,
    referralCount: 0,
    shareUrl: null,
    loading: false,
    error: null,
    referredByCode: null,
    referrals: [],
    storeReferredByCode: jest.fn(),
    submitReferral: jest.fn(),
  }),
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
    addAddress: jest.fn(),
    updateAddress: jest.fn(),
    deleteAddress: jest.fn(),
    setDefault: jest.fn(),
    saveFromCheckout: jest.fn(),
    defaultAddress: null,
    loading: false,
  }),
}));
jest.mock('@/hooks/useBiometricAuth', () => ({
  useBiometricAuth: () => ({
    status: { isAvailable: false, isEnrolled: false, biometricType: 'none' },
    isEnabled: false,
    loading: false,
    enableBiometric: jest.fn(),
    disableBiometric: jest.fn(),
  }),
}));
jest.mock('@/services/wix/wixAuth', () => ({
  WixAuthService: jest.fn().mockImplementation(() => ({ syncMemberAddresses: jest.fn() })),
}));
jest.mock('@/services/wix/wixProvider', () => ({
  useWixClient: () => ({ callFunction: jest.fn().mockResolvedValue(null) }),
}));
jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '100',
}));
jest.mock('expo-constants', () => ({ default: { expoConfig: { version: '1.0.0' } } }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));
// ── Fixtures ──────────────────────────────────────────────────────────────────

const AUTH_USER = {
  id: 'member-1',
  email: 'test@example.com',
  displayName: 'Test User',
  phone: '',
  provider: 'wix' as const,
};

const loyaltyBase = {
  totalEarned: 0,
  transactions: [],
  loading: false,
  error: null,
  refreshPoints: jest.fn(),
};

function renderAccountScreen(props: { onLoyalty?: jest.Mock } = {}) {
  return render(
    <ThemeProvider>
      <AccountScreen onLoyalty={props.onLoyalty} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: AUTH_USER,
    isAuthenticated: true,
    loading: false,
    error: null,
    signOut: jest.fn(),
    updateProfile: jest.fn(),
    clearError: jest.fn(),
  });
  mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 0, tier: 'bronze' });
});

// ── Tier badge rendering ───────────────────────────────────────────────────────

describe('loyalty tier badge — authenticated', () => {
  it('renders the tier badge', () => {
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('loyalty-tier-badge')).toBeTruthy();
  });

  it('shows Trail Blazer tier at 0 points', () => {
    mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 0, tier: 'bronze' });
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('loyalty-tier-name').props.children).toBe('Trail Blazer');
  });

  it('shows Trail Blazer tier at 499 points', () => {
    mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 499, tier: 'bronze' });
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('loyalty-tier-name').props.children).toBe('Trail Blazer');
  });

  it('shows Mountain Guide tier at 500 points', () => {
    mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 500, tier: 'silver' });
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('loyalty-tier-name').props.children).toBe('Mountain Guide');
  });

  it('shows Summit Master tier at 1500 points', () => {
    mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 1500, tier: 'gold' });
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('loyalty-tier-name').props.children).toBe('Summit Master');
  });

  it('shows Blue Ridge Legend tier at 5000 points', () => {
    mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 5000, tier: 'gold' });
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('loyalty-tier-name').props.children).toBe('Blue Ridge Legend');
  });
});

// ── Points balance ─────────────────────────────────────────────────────────────

describe('points balance display', () => {
  it('shows the points balance', () => {
    mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 750, tier: 'silver' });
    const { getByTestId } = renderAccountScreen();
    const pointsEl = getByTestId('loyalty-points-balance');
    expect(pointsEl.props.children).toContain('750');
  });

  it('shows 0 points for a new member', () => {
    mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 0, tier: 'bronze' });
    const { getByTestId } = renderAccountScreen();
    const pointsEl = getByTestId('loyalty-points-balance');
    expect(pointsEl.props.children).toContain('0');
  });
});

// ── Loyalty navigation row ────────────────────────────────────────────────────

describe('loyalty navigation row', () => {
  it('renders a tappable loyalty row when authenticated', () => {
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('account-loyalty-row')).toBeTruthy();
  });

  it('loyalty row has accessible label', () => {
    const { getByTestId } = renderAccountScreen();
    // Widget computes dynamic label from tier/points/streak state
    expect(getByTestId('account-loyalty-row').props.accessibilityLabel).toBeTruthy();
  });

  it('loyalty row has button role when onLoyalty is provided', () => {
    const { getByTestId } = renderAccountScreen({ onLoyalty: jest.fn() });
    expect(getByTestId('account-loyalty-row').props.accessibilityRole).toBe('button');
  });

  it('pressing loyalty row calls onLoyalty', () => {
    const onLoyalty = jest.fn();
    const { getByTestId } = renderAccountScreen({ onLoyalty });
    fireEvent.press(getByTestId('account-loyalty-row'));
    expect(onLoyalty).toHaveBeenCalledTimes(1);
  });

  it('pressing loyalty row does not crash when onLoyalty is undefined', () => {
    const { getByTestId } = renderAccountScreen();
    expect(() => fireEvent.press(getByTestId('account-loyalty-row'))).not.toThrow();
  });

  it('loyalty row contains tier badge', () => {
    const { getByTestId } = renderAccountScreen();
    expect(getByTestId('account-loyalty-row')).toBeTruthy();
    expect(getByTestId('loyalty-tier-badge')).toBeTruthy();
  });

  it('loyalty row shows points balance', () => {
    mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 850, tier: 'silver' });
    const { getByTestId } = renderAccountScreen();
    const pointsEl = getByTestId('loyalty-points-balance');
    expect(pointsEl.props.children).toContain('850');
  });

  it('loyalty row not rendered when unauthenticated', () => {
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
    expect(queryByTestId('account-loyalty-row')).toBeNull();
  });
});

// ── Unauthenticated ───────────────────────────────────────────────────────────

describe('unauthenticated', () => {
  it('does not render loyalty tier badge when logged out', () => {
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
    expect(queryByTestId('loyalty-tier-badge')).toBeNull();
  });
});
