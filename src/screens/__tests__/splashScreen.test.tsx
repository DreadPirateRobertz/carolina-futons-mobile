/**
 * splashScreen tests — cm-bua
 *
 * Tests the AppNavigator loading/gating behavior (the "splash" phase):
 * - Slow load timeout: spinner persists while isLoading is true
 * - Auth error redirect: storage failure defaults to Onboarding (not Tabs)
 * - Normal routing: routes to Onboarding vs Tabs based on hasSeenOnboarding
 */
import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNavigator } from '@/navigation/AppNavigator';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/components/BrandedSpinner', () => ({
  BrandedSpinner: () => null,
}));

jest.mock('@/navigation/TabNavigator', () => ({
  TabNavigator: () => {
    const { View } = require('react-native');
    return <View testID="tab-navigator-mock" />;
  },
}));

jest.mock('@/screens/OnboardingScreen', () => ({
  OnboardingScreen: ({ onComplete }: { onComplete: () => void }) => {
    const { View, TouchableOpacity } = require('react-native');
    return (
      <View testID="onboarding-screen-mock">
        <TouchableOpacity testID="onboarding-complete-btn" onPress={onComplete} />
      </View>
    );
  },
}));

jest.mock('@/navigation/withScreenErrorBoundary', () => ({
  withScreenErrorBoundary: (Component: React.ComponentType) => Component,
}));

// Mock all lazy-loaded screens (prevent dynamic import issues in tests)
jest.mock('@/screens/ARScreen', () => ({ ARScreen: () => null }));
jest.mock('@/screens/ProductDetailScreen', () => ({ ProductDetailScreen: () => null }));
jest.mock('@/screens/CategoryScreen', () => ({ CategoryScreen: () => null }));
jest.mock('@/screens/CheckoutScreen', () => ({ CheckoutScreen: () => null }));
jest.mock('@/screens/OrderHistoryScreen', () => ({ OrderHistoryScreen: () => null }));
jest.mock('@/screens/OrderDetailScreen', () => ({ OrderDetailScreen: () => null }));
jest.mock('@/screens/LoginScreen', () => ({ LoginScreen: () => null }));
jest.mock('@/screens/SignUpScreen', () => ({ SignUpScreen: () => null }));
jest.mock('@/screens/ForgotPasswordScreen', () => ({ ForgotPasswordScreen: () => null }));
jest.mock('@/screens/NotificationPreferencesScreen', () => ({
  NotificationPreferencesScreen: () => null,
}));
jest.mock('@/screens/WishlistScreen', () => ({ WishlistScreen: () => null }));
jest.mock('@/screens/StoreLocatorScreen', () => ({ StoreLocatorScreen: () => null }));
jest.mock('@/screens/StoreDetailScreen', () => ({ StoreDetailScreen: () => null }));
jest.mock('@/screens/ARWebScreen', () => ({ ARWebScreen: () => null }));
jest.mock('@/screens/CollectionsScreen', () => ({ CollectionsScreen: () => null }));
jest.mock('@/screens/CollectionDetailScreen', () => ({ CollectionDetailScreen: () => null }));
jest.mock('@/screens/PremiumScreen', () => ({ PremiumScreen: () => null }));
jest.mock('@/screens/StyleQuizScreen', () => ({ StyleQuizScreen: () => null }));
jest.mock('@/screens/OrderConfirmationScreen', () => ({ OrderConfirmationScreen: () => null }));
jest.mock('@/screens/AchievementBadgesScreen', () => ({ AchievementBadgesScreen: () => null }));
jest.mock('@/screens/NotificationsScreen', () => ({ NotificationsScreen: () => null }));
jest.mock('@/screens/LeaderboardScreen', () => ({ LeaderboardScreen: () => null }));
jest.mock('@/screens/ChallengesScreen', () => ({ ChallengesScreen: () => null }));
jest.mock('@/screens/AvatarEquipScreen', () => ({ AvatarEquipScreen: () => null }));
jest.mock('@/screens/RoomGalleryScreen', () => ({ RoomGalleryScreen: () => null }));
jest.mock('@/screens/SavedAddressesScreen', () => ({ SavedAddressesScreen: () => null }));
jest.mock('@/screens/SearchScreen', () => ({ SearchScreen: () => null }));
jest.mock('@/screens/CompareScreen', () => ({ CompareScreen: () => null }));
jest.mock('@/screens/PrivacyPolicyScreen', () => ({ PrivacyPolicyScreen: () => null }));
jest.mock('@/screens/LoyaltyScreen', () => ({ LoyaltyScreen: () => null }));
jest.mock('@/screens/WarrantyRegistrationScreen', () => ({
  WarrantyRegistrationScreen: () => null,
}));
jest.mock('@/screens/ConsultationBookingScreen', () => ({
  ConsultationBookingScreen: () => null,
}));
jest.mock('@/screens/BookingCancellationScreen', () => ({
  BookingCancellationScreen: () => null,
}));
jest.mock('@/screens/ReferralLandingScreen', () => ({ ReferralLandingScreen: () => null }));
jest.mock('@/screens/TrailsScreen', () => ({ TrailsScreen: () => null }));
jest.mock('@/screens/VisualSearchResultsScreen', () => ({
  VisualSearchResultsScreen: () => null,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderNavigator() {
  return render(
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Slow load timeout ────────────────────────────────────────────────────────

describe('slow load timeout', () => {
  it('shows loading spinner while AsyncStorage is resolving', async () => {
    let resolveStorage: ((val: string | null) => void) | undefined;
    (AsyncStorage.getItem as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStorage = resolve;
        }),
    );
    const { getByTestId } = renderNavigator();
    expect(getByTestId('onboarding-loading')).toBeTruthy();
    // Resolve to clean up open handle
    resolveStorage?.(null);
  });

  it('loading spinner is absent after AsyncStorage resolves', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const { queryByTestId } = renderNavigator();
    await waitFor(() => {
      expect(queryByTestId('onboarding-loading')).toBeNull();
    });
  });

  it('loading spinner is absent when AsyncStorage returns "true"', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
    const { queryByTestId } = renderNavigator();
    await waitFor(() => {
      expect(queryByTestId('onboarding-loading')).toBeNull();
    });
  });
});

// ─── Auth error redirect ──────────────────────────────────────────────────────

describe('auth error redirect', () => {
  it('shows Onboarding when AsyncStorage throws (defaults to hasSeenOnboarding: false)', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage unavailable'));
    const { getByTestId } = renderNavigator();
    await waitFor(() => {
      expect(getByTestId('onboarding-screen-mock')).toBeTruthy();
    });
  });

  it('does NOT show Tabs when AsyncStorage throws (auth error)', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage unavailable'));
    const { queryByTestId } = renderNavigator();
    await waitFor(() => {
      expect(queryByTestId('onboarding-loading')).toBeNull();
    });
    expect(queryByTestId('tab-navigator-mock')).toBeNull();
  });
});

// ─── Normal routing ───────────────────────────────────────────────────────────

describe('normal routing', () => {
  it('shows Onboarding screen when user has NOT seen onboarding', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const { getByTestId } = renderNavigator();
    await waitFor(() => {
      expect(getByTestId('onboarding-screen-mock')).toBeTruthy();
    });
  });

  it('shows Tabs when user HAS seen onboarding', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
    const { getByTestId } = renderNavigator();
    await waitFor(() => {
      expect(getByTestId('tab-navigator-mock')).toBeTruthy();
    });
  });

  it('onboarding-loading is not shown after onboarding completion check', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
    const { queryByTestId } = renderNavigator();
    await waitFor(() => {
      expect(queryByTestId('onboarding-loading')).toBeNull();
    });
  });
});
