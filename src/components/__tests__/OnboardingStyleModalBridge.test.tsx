/**
 * Tests for OnboardingStyleModalBridge — cm-qdm
 *
 * AC:
 *  1. Modal NOT shown if onboarding not yet completed
 *  2. Modal NOT shown if style prefs already set in AsyncStorage
 *  3. Modal shown when onboarding is complete AND style prefs not set
 *  4. Modal hidden after onComplete
 *  5. Modal hidden after onDismiss (user skips)
 *  6. AsyncStorage error on read is handled gracefully (modal not shown)
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingStyleModalBridge } from '../OnboardingStyleModalBridge';
import { ONBOARDING_STYLE_STORAGE_KEY } from '@/hooks/useOnboardingStyleQuiz';

// --- Mocks ---

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

let mockHasSeenOnboarding = true;

jest.mock('@/hooks/useOnboarding', () => ({
  useOnboarding: () => ({
    isLoading: false,
    hasSeenOnboarding: mockHasSeenOnboarding,
    completeOnboarding: jest.fn(),
  }),
}));

// Track what modal renders with
const mockOnboardingStyleModal = jest.fn();
jest.mock('../OnboardingStyleModal', () => ({
  OnboardingStyleModal: (props: { visible: boolean; onDismiss: () => void; onComplete: () => void }) => {
    mockOnboardingStyleModal(props);
    return null;
  },
}));

// --- Tests ---

describe('OnboardingStyleModalBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasSeenOnboarding = true;
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null); // no prefs by default
  });

  it('does not show modal when onboarding not yet complete', async () => {
    mockHasSeenOnboarding = false;
    render(<OnboardingStyleModalBridge />);
    await waitFor(() => {
      expect(mockOnboardingStyleModal).toHaveBeenCalledWith(
        expect.objectContaining({ visible: false }),
      );
    });
  });

  it('does not show modal when style prefs already exist in AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ furnitureStyle: 'coastal', roomType: 'bedroom', savedAt: '2026-04-05T00:00:00Z' }),
    );
    render(<OnboardingStyleModalBridge />);
    await waitFor(() => {
      expect(mockOnboardingStyleModal).toHaveBeenCalledWith(
        expect.objectContaining({ visible: false }),
      );
    });
  });

  it('shows modal when onboarding complete and no style prefs set', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    render(<OnboardingStyleModalBridge />);
    await waitFor(() => {
      expect(mockOnboardingStyleModal).toHaveBeenCalledWith(
        expect.objectContaining({ visible: true }),
      );
    });
  });

  it('checks AsyncStorage with the correct key', async () => {
    render(<OnboardingStyleModalBridge />);
    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(ONBOARDING_STYLE_STORAGE_KEY);
    });
  });

  it('hides modal after onComplete is called', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    render(<OnboardingStyleModalBridge />);

    // Wait for modal to appear
    await waitFor(() => {
      expect(mockOnboardingStyleModal).toHaveBeenCalledWith(
        expect.objectContaining({ visible: true }),
      );
    });

    // Simulate onComplete
    const lastCall = mockOnboardingStyleModal.mock.calls.at(-1)![0];
    lastCall.onComplete();

    await waitFor(() => {
      expect(mockOnboardingStyleModal).toHaveBeenCalledWith(
        expect.objectContaining({ visible: false }),
      );
    });
  });

  it('hides modal after onDismiss is called', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    render(<OnboardingStyleModalBridge />);

    await waitFor(() => {
      expect(mockOnboardingStyleModal).toHaveBeenCalledWith(
        expect.objectContaining({ visible: true }),
      );
    });

    const lastCall = mockOnboardingStyleModal.mock.calls.at(-1)![0];
    lastCall.onDismiss();

    await waitFor(() => {
      expect(mockOnboardingStyleModal).toHaveBeenCalledWith(
        expect.objectContaining({ visible: false }),
      );
    });
  });

  it('handles AsyncStorage read error gracefully — modal not shown', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('storage error'));
    render(<OnboardingStyleModalBridge />);
    await waitFor(() => {
      expect(mockOnboardingStyleModal).toHaveBeenCalledWith(
        expect.objectContaining({ visible: false }),
      );
    });
  });
});
