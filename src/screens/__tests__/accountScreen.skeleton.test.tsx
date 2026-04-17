import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AccountScreen } from '../AccountScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.2.3',
  nativeBuildVersion: '42',
  applicationId: 'com.carolinafutons.app',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

const mockAuthState: {
  user: null | { id: string; email: string; displayName: string; phone?: string };
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
} = {
  user: null,
  loading: true,
  isAuthenticated: false,
  error: null,
};

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    ...mockAuthState,
    signOut: jest.fn(),
    updateProfile: jest.fn(),
    clearError: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  AuthContext: { _currentValue: null },
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

jest.mock('@/hooks/usePremium', () => ({
  PremiumProvider: ({ children }: any) => children,
  usePremium: () => ({
    isPremium: false,
    isLoading: false,
    offerings: [],
    error: null,
    purchase: jest.fn(),
    restore: jest.fn(),
    refreshStatus: jest.fn(),
  }),
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
  useDataExport: () => ({
    status: 'idle',
    error: null,
    exportData: jest.fn(),
  }),
}));

jest.mock('@/hooks/useSavedAddresses', () => ({
  useSavedAddresses: () => ({
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

jest.mock('@/hooks/useGamificationEvents', () => ({
  useGamificationEvents: () => ({
    referralShared: jest.fn(),
    badgeEarned: jest.fn(),
    tierChanged: jest.fn(),
    streakExtended: jest.fn(),
  }),
}));

jest.mock('@/services/wix/wixProvider', () => ({
  useWixClient: () => ({ callFunction: jest.fn().mockResolvedValue(null) }),
  useOptionalWixClient: () => null,
}));

jest.mock('@/components/ShareSheet', () => ({
  ShareSheet: () => null,
}));

jest.mock('@/components/AccountGamificationHeader', () => ({
  AccountGamificationHeader: () => null,
}));

jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => ({
    points: 0,
    tier: 'bronze',
    totalEarned: 0,
    transactions: [],
    loading: false,
    error: null,
    refreshPoints: jest.fn(),
  }),
}));

function renderAccount(props: Partial<React.ComponentProps<typeof AccountScreen>> = {}) {
  return render(
    <ThemeProvider>
      <AccountScreen {...props} />
    </ThemeProvider>,
  );
}

describe('AccountScreen loading skeleton', () => {
  beforeEach(() => {
    mockAuthState.user = null;
    mockAuthState.loading = true;
    mockAuthState.isAuthenticated = false;
    mockAuthState.error = null;
  });

  it('renders account skeleton while auth is loading and user is not yet known', () => {
    mockAuthState.loading = true;
    mockAuthState.isAuthenticated = false;
    mockAuthState.user = null;
    const { getByTestId } = renderAccount();
    expect(getByTestId('account-skeleton')).toBeTruthy();
  });

  it('skeleton has accessibility label for screen readers', () => {
    mockAuthState.loading = true;
    const { getByTestId } = renderAccount();
    expect(getByTestId('account-skeleton').props.accessibilityLabel).toBe('Loading account');
  });

  it('skeleton contains SkeletonRow/SkeletonCard primitives', () => {
    mockAuthState.loading = true;
    const { getAllByLabelText } = renderAccount();
    const loadingElements = getAllByLabelText('Loading');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('does not render skeleton when auth has resolved as guest', () => {
    mockAuthState.loading = false;
    mockAuthState.isAuthenticated = false;
    mockAuthState.user = null;
    const { queryByTestId, getByTestId } = renderAccount();
    expect(queryByTestId('account-skeleton')).toBeNull();
    expect(getByTestId('guest-title')).toBeTruthy();
  });

  it('does not render skeleton when auth has resolved as authenticated user', () => {
    mockAuthState.loading = false;
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = {
      id: 'u1',
      email: 'a@b.com',
      displayName: 'Test User',
    };
    const { queryByTestId, getByTestId } = renderAccount();
    expect(queryByTestId('account-skeleton')).toBeNull();
    expect(getByTestId('user-display-name')).toBeTruthy();
  });

  it('renders guest view after loading flips to false', async () => {
    mockAuthState.loading = true;
    const { queryByTestId, rerender } = renderAccount();
    expect(queryByTestId('account-skeleton')).toBeTruthy();

    mockAuthState.loading = false;
    rerender(
      <ThemeProvider>
        <AccountScreen />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(queryByTestId('account-skeleton')).toBeNull();
    });
  });

  it('does not render skeleton when already authenticated even if loading flickers true', () => {
    // Edge case: auth can re-enter loading for token refresh on an authed user.
    // In that case we should NOT blank the screen with a skeleton.
    mockAuthState.loading = true;
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = {
      id: 'u1',
      email: 'a@b.com',
      displayName: 'Existing User',
    };
    const { queryByTestId, getByTestId } = renderAccount();
    expect(queryByTestId('account-skeleton')).toBeNull();
    expect(getByTestId('user-display-name')).toBeTruthy();
  });
});
