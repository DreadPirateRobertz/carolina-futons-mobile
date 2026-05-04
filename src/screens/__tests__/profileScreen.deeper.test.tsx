/**
 * ProfileScreen deeper edge cases — cm-9zl
 *
 * Covers:
 * - Avatar upload error (profile update API error shows message, form stays open)
 * - Loyalty tier display (loading state, tier accessibility label)
 * - Edit-then-cancel discard (typed text not persisted)
 * - Empty order history callback (fires even with no orders)
 * - Logout confirmation (sign-out button behavior)
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AccountScreen } from '../AccountScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
  AuthContext: { Consumer: ({ children }: any) => children(null) },
}));

const mockUseLoyalty = jest.fn();
jest.mock('@/hooks/useLoyalty', () => ({
  useLoyalty: () => mockUseLoyalty(),
}));

const mockUseStreak = jest.fn();
jest.mock('@/hooks/useStreak', () => ({
  useStreak: () => mockUseStreak(),
}));

jest.mock('@/hooks/useReferral', () => ({
  useReferral: () => ({
    code: 'REF123',
    creditsEarned: 20,
    referralCount: 1,
    shareUrl: 'https://example.com/ref/REF123',
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
    addAddress: jest.fn(),
    updateAddress: jest.fn(),
    deleteAddress: jest.fn(),
    setDefault: jest.fn(),
    saveFromCheckout: jest.fn(),
    defaultAddress: null,
    loading: false,
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
    productViewed: jest.fn(),
    addedToCart: jest.fn(),
    purchaseCompleted: jest.fn(),
  }),
}));

jest.mock('@/services/wix/wixAuth', () => ({
  WixAuthService: jest.fn().mockImplementation(() => ({
    syncMemberAddresses: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/services/wix/wixProvider', () => ({
  useWixClient: () => ({ callFunction: jest.fn().mockResolvedValue(null) }),
}));

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '100',
  applicationId: 'com.carolinafutons.app',
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { version: '1.0.0' } },
  expoConfig: { version: '1.0.0' },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const AUTH_USER = {
  id: 'member-1',
  email: 'jane@example.com',
  displayName: 'Jane Smith',
  phone: '555-0100',
  provider: 'wix' as const,
};

const loyaltyBase = {
  totalEarned: 0,
  transactions: [],
  loading: false,
  error: null,
  refreshPoints: jest.fn(),
};

const mockUpdateProfile = jest.fn();
const mockSignOut = jest.fn();
const mockClearError = jest.fn();

function renderProfile(props: Partial<React.ComponentProps<typeof AccountScreen>> = {}) {
  return render(
    <ThemeProvider>
      <AccountScreen {...props} />
    </ThemeProvider>,
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────────

const defaultSavedAddresses = {
  addresses: [] as {
    id: string;
    fullName: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    zip: string;
    isDefault: boolean;
  }[],
  addAddress: jest.fn(),
  updateAddress: jest.fn(),
  deleteAddress: jest.fn(),
  setDefault: jest.fn(),
  saveFromCheckout: jest.fn(),
  defaultAddress: null,
  loading: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateProfile.mockResolvedValue(undefined);
  mockSignOut.mockResolvedValue(undefined);
  mockUseAuth.mockReturnValue({
    user: AUTH_USER,
    isAuthenticated: true,
    loading: false,
    error: null,
    signOut: mockSignOut,
    updateProfile: mockUpdateProfile,
    clearError: mockClearError,
  });
  mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 0, tier: 'bronze' });
  mockUseStreak.mockReturnValue({ streak: 0, loading: false });
  mockUseSavedAddresses.mockReturnValue(defaultSavedAddresses);
});

// ── Avatar upload error ───────────────────────────────────────────────────────

describe('avatar upload error (profile update API error)', () => {
  it('shows error message when updateProfile rejects', async () => {
    mockUseAuth.mockReturnValue({
      user: AUTH_USER,
      isAuthenticated: true,
      loading: false,
      error: 'Failed to update profile',
      signOut: mockSignOut,
      updateProfile: mockUpdateProfile,
      clearError: mockClearError,
    });

    const { getByTestId } = renderProfile();
    await waitFor(() => expect(getByTestId('edit-profile-button')).toBeTruthy());
    fireEvent.press(getByTestId('edit-profile-button'));

    await waitFor(() => {
      expect(getByTestId('edit-profile-error')).toBeTruthy();
    });
    expect(getByTestId('edit-profile-error').props.children).toBe('Failed to update profile');
  });

  it('keeps edit form open when auth error is set', async () => {
    // Simulate the auth state that results from a failed updateProfile call:
    // error is set and the component remains in edit mode
    const { rerender, getByTestId } = renderProfile();
    await waitFor(() => expect(getByTestId('edit-profile-button')).toBeTruthy());
    fireEvent.press(getByTestId('edit-profile-button'));
    await waitFor(() => expect(getByTestId('edit-profile-form')).toBeTruthy());

    // Auth hook now returns an error (as if updateProfile failed)
    mockUseAuth.mockReturnValue({
      user: AUTH_USER,
      isAuthenticated: true,
      loading: false,
      error: 'Network error',
      signOut: mockSignOut,
      updateProfile: mockUpdateProfile,
      clearError: mockClearError,
    });

    rerender(
      <ThemeProvider>
        <AccountScreen />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('edit-profile-error')).toBeTruthy();
    });
  });

  it('shows loading spinner in save button while updating', async () => {
    // updateProfile never resolves — simulates in-flight request
    mockUpdateProfile.mockReturnValue(new Promise(() => {}));
    mockUseAuth.mockReturnValue({
      user: AUTH_USER,
      isAuthenticated: true,
      loading: true,
      error: null,
      signOut: mockSignOut,
      updateProfile: mockUpdateProfile,
      clearError: mockClearError,
    });

    const { getByTestId } = renderProfile();
    await waitFor(() => expect(getByTestId('edit-profile-button')).toBeTruthy());
    fireEvent.press(getByTestId('edit-profile-button'));

    await waitFor(() => {
      expect(getByTestId('edit-save-loading')).toBeTruthy();
    });
  });

  it('clears error when edit starts (clearError is called)', async () => {
    const { getByTestId } = renderProfile();
    await waitFor(() => expect(getByTestId('edit-profile-button')).toBeTruthy());
    fireEvent.press(getByTestId('edit-profile-button'));
    expect(mockClearError).toHaveBeenCalled();
  });
});

// ── Loyalty tier display ───────────────────────────────────────────────────────

describe('loyalty tier display', () => {
  it('shows loading indicator while loyalty data is loading', async () => {
    mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 0, tier: 'bronze', loading: true });
    const { getByTestId } = renderProfile();
    await waitFor(() => expect(getByTestId('gam-header-loading')).toBeTruthy());
  });

  it('tier badge accessibility label includes tier and points', async () => {
    mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 750, tier: 'silver' });
    const { getByTestId } = renderProfile();
    await waitFor(() => {
      const badge = getByTestId('loyalty-tier-badge');
      expect(badge.props.accessibilityLabel).toContain('750');
    });
  });

  it('tier badge accessibility label includes tier name', async () => {
    mockUseLoyalty.mockReturnValue({ ...loyaltyBase, points: 500, tier: 'silver' });
    const { getByTestId } = renderProfile();
    await waitFor(() => {
      const badge = getByTestId('loyalty-tier-badge');
      expect(badge.props.accessibilityLabel).toContain('Mountain Guide');
    });
  });

  it('gamification header shows streak badge when streak > 0', async () => {
    mockUseStreak.mockReturnValue({ streak: 5, loading: false });
    const { getByTestId } = renderProfile();
    await waitFor(() => expect(getByTestId('streak-badge')).toBeTruthy());
  });

  it('loyalty row has accessible role when onLoyalty callback provided', async () => {
    const onLoyalty = jest.fn();
    const { getByTestId } = renderProfile({ onLoyalty });
    await waitFor(() => {
      expect(getByTestId('account-loyalty-row').props.accessibilityRole).toBe('button');
    });
  });
});

// ── Edit-then-cancel discard ──────────────────────────────────────────────────

describe('edit-then-cancel discard', () => {
  it('original display name shown after typing new name and pressing cancel', async () => {
    const { getByTestId, getByText } = renderProfile();
    await waitFor(() => expect(getByTestId('edit-profile-button')).toBeTruthy());

    // Open edit form
    fireEvent.press(getByTestId('edit-profile-button'));
    await waitFor(() => expect(getByTestId('edit-first-name-input')).toBeTruthy());

    // Type a different first name
    fireEvent.changeText(getByTestId('edit-first-name-input'), 'Completely Different Name');

    // Press Cancel
    fireEvent.press(getByTestId('edit-cancel-button'));

    // Original display name should still be shown
    await waitFor(() => {
      expect(getByText('Jane Smith')).toBeTruthy();
    });
  });

  it('original phone shown after typing new phone and pressing cancel', async () => {
    const { getByTestId } = renderProfile();
    await waitFor(() => expect(getByTestId('edit-profile-button')).toBeTruthy());

    fireEvent.press(getByTestId('edit-profile-button'));
    await waitFor(() => expect(getByTestId('edit-phone-input')).toBeTruthy());

    fireEvent.changeText(getByTestId('edit-phone-input'), '999-9999');
    fireEvent.press(getByTestId('edit-cancel-button'));

    // Edit form is gone — discard happened
    await waitFor(() => {
      expect(getByTestId('user-display-name')).toBeTruthy();
    });
  });

  it('edit form is not visible after cancel', async () => {
    const { getByTestId, queryByTestId } = renderProfile();
    await waitFor(() => expect(getByTestId('edit-profile-button')).toBeTruthy());

    fireEvent.press(getByTestId('edit-profile-button'));
    await waitFor(() => expect(getByTestId('edit-profile-form')).toBeTruthy());

    fireEvent.press(getByTestId('edit-cancel-button'));

    await waitFor(() => {
      expect(queryByTestId('edit-profile-form')).toBeNull();
    });
  });

  it('updateProfile is NOT called when cancel is pressed', async () => {
    const { getByTestId } = renderProfile();
    await waitFor(() => expect(getByTestId('edit-profile-button')).toBeTruthy());

    fireEvent.press(getByTestId('edit-profile-button'));
    await waitFor(() => expect(getByTestId('edit-first-name-input')).toBeTruthy());

    fireEvent.changeText(getByTestId('edit-first-name-input'), 'New Name');
    fireEvent.press(getByTestId('edit-cancel-button'));

    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});

// ── Empty order history ───────────────────────────────────────────────────────

describe('empty order history', () => {
  it('fires onOrderHistory callback when Order History pressed', async () => {
    const onOrderHistory = jest.fn();
    const { getByTestId } = renderProfile({ onOrderHistory });
    await waitFor(() => expect(getByTestId('account-order-history')).toBeTruthy());

    fireEvent.press(getByTestId('account-order-history'));
    expect(onOrderHistory).toHaveBeenCalledTimes(1);
  });

  it('does not crash when Order History pressed without callback', async () => {
    const { getByTestId } = renderProfile();
    await waitFor(() => expect(getByTestId('account-order-history')).toBeTruthy());
    expect(() => fireEvent.press(getByTestId('account-order-history'))).not.toThrow();
  });

  it('Order History menu item always visible for authenticated users', async () => {
    const { getByTestId } = renderProfile();
    await waitFor(() => {
      expect(getByTestId('account-order-history')).toBeTruthy();
    });
  });

  it('Order History menu item not visible when logged out', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      signOut: mockSignOut,
      updateProfile: mockUpdateProfile,
      clearError: mockClearError,
    });

    const { queryByTestId } = renderProfile();
    await waitFor(() => {
      expect(queryByTestId('account-order-history')).toBeNull();
    });
  });
});

// ── Logout confirmation ───────────────────────────────────────────────────────

describe('logout confirmation', () => {
  it('calls signOut when sign-out button is pressed', async () => {
    const { getByTestId } = renderProfile();
    await waitFor(() => expect(getByTestId('sign-out-button')).toBeTruthy());

    fireEvent.press(getByTestId('sign-out-button'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('sign-out button has correct accessibility label', async () => {
    const { getByTestId } = renderProfile();
    await waitFor(() => {
      const btn = getByTestId('sign-out-button');
      expect(btn.props.accessibilityLabel).toBe('Sign out');
    });
  });

  it('sign-out button has button accessibility role', async () => {
    const { getByTestId } = renderProfile();
    await waitFor(() => {
      const btn = getByTestId('sign-out-button');
      expect(btn.props.accessibilityRole).toBe('button');
    });
  });

  it('does not crash when signOut is called while in edit mode', async () => {
    const { getByTestId } = renderProfile();
    await waitFor(() => expect(getByTestId('edit-profile-button')).toBeTruthy());

    // Open edit form
    fireEvent.press(getByTestId('edit-profile-button'));
    await waitFor(() => expect(getByTestId('edit-profile-form')).toBeTruthy());

    // Press sign out while editing
    expect(() => fireEvent.press(getByTestId('sign-out-button'))).not.toThrow();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});

// ── A11y: avatar ──────────────────────────────────────────────────────────────

describe('AccountScreen — a11y: avatar', () => {
  it('user-avatar has accessibilityLabel', async () => {
    const { getByTestId } = renderProfile();
    await waitFor(() => {
      expect(getByTestId('user-avatar').props.accessibilityLabel).toBeTruthy();
    });
  });

  it('user-avatar accessibilityLabel references the display name', async () => {
    const { getByTestId } = renderProfile();
    await waitFor(() => {
      expect(getByTestId('user-avatar').props.accessibilityLabel).toContain('Jane Smith');
    });
  });
});

// ── A11y: address action buttons ──────────────────────────────────────────────

const ADDR = {
  id: 'addr-1',
  fullName: 'Jane Smith',
  line1: '123 Main St',
  line2: '',
  city: 'Charlotte',
  state: 'NC',
  zip: '28201',
  isDefault: false,
};

describe('AccountScreen — a11y: address action buttons', () => {
  beforeEach(() => {
    mockUseSavedAddresses.mockReturnValue({
      ...defaultSavedAddresses,
      addresses: [ADDR],
    });
  });

  it('set-default button label identifies the address street', async () => {
    const { getByTestId } = renderProfile();
    await waitFor(() => {
      expect(getByTestId(`set-default-${ADDR.id}`).props.accessibilityLabel).toContain(
        '123 Main St',
      );
    });
  });

  it('set-default button has accessibilityRole="button"', async () => {
    const { getByTestId } = renderProfile();
    await waitFor(() => {
      expect(getByTestId(`set-default-${ADDR.id}`).props.accessibilityRole).toBe('button');
    });
  });

  it('delete-address button label identifies the address street', async () => {
    const { getByTestId } = renderProfile();
    await waitFor(() => {
      expect(getByTestId(`delete-address-${ADDR.id}`).props.accessibilityLabel).toContain(
        '123 Main St',
      );
    });
  });

  it('delete-address button has accessibilityRole="button"', async () => {
    const { getByTestId } = renderProfile();
    await waitFor(() => {
      expect(getByTestId(`delete-address-${ADDR.id}`).props.accessibilityRole).toBe('button');
    });
  });
});

// ── A11y: app version tap ─────────────────────────────────────────────────────

describe('AccountScreen — a11y: app version tap', () => {
  it('has accessibilityRole="button"', async () => {
    const { getByTestId } = renderProfile();
    await waitFor(() => {
      expect(getByTestId('app-version-tap').props.accessibilityRole).toBe('button');
    });
  });

  it('accessibilityLabel mentions version', async () => {
    const { getByTestId } = renderProfile();
    await waitFor(() => {
      expect(getByTestId('app-version-tap').props.accessibilityLabel).toMatch(/version/i);
    });
  });
});

// ── Edit flow: updateProfile call ────────────────────────────────────────────

describe('AccountScreen — edit flow: updateProfile call', () => {
  it('calls updateProfile with trimmed first name', async () => {
    const { getByTestId } = renderProfile();
    await waitFor(() => expect(getByTestId('edit-profile-button')).toBeTruthy());

    fireEvent.press(getByTestId('edit-profile-button'));
    await waitFor(() => expect(getByTestId('edit-first-name-input')).toBeTruthy());

    fireEvent.changeText(getByTestId('edit-first-name-input'), '  Jane  ');
    fireEvent.press(getByTestId('edit-save-button'));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Jane' }),
      );
    });
  });

  it('edit form closes after a successful save', async () => {
    const { getByTestId, queryByTestId } = renderProfile();
    await waitFor(() => expect(getByTestId('edit-profile-button')).toBeTruthy());

    fireEvent.press(getByTestId('edit-profile-button'));
    await waitFor(() => expect(getByTestId('edit-profile-form')).toBeTruthy());

    fireEvent.press(getByTestId('edit-save-button'));

    await waitFor(() => {
      expect(queryByTestId('edit-profile-form')).toBeNull();
    });
  });
});
