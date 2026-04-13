/**
 * OnboardingScreen deeper edge cases — cm-c2l
 *
 * Covers:
 * - Skip flow deeper (skip on slide 2, skip saves no preferences)
 * - Back nav deeper (back on completion hidden, back traverses quiz backwards)
 * - Permission prompts denied (requestPermission called at finish, denied still completes)
 * - Re-entry guard (AsyncStorage 'onboarding_complete' → calls onComplete immediately)
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingScreen } from '../OnboardingScreen';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sandBase: '#E8D5B7',
      sandLight: '#F2E8D5',
      sandDark: '#D4BC96',
      espresso: '#3A2518',
      espressoLight: '#5C4033',
      sunsetCoral: '#E8845C',
      sunsetCoralLight: '#F2A882',
      mountainBlue: '#5B8FA8',
      white: '#FFFFFF',
      muted: '#999999',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    borderRadius: { button: 8, pill: 9999, card: 12, sm: 4, md: 8 },
    typography: {
      headingFamily: 'PlayfairDisplay_700Bold',
      bodyFamily: 'SourceSans3_400Regular',
      bodyFamilySemiBold: 'SourceSans3_600SemiBold',
      heroTitle: { fontSize: 42, fontWeight: '700', lineHeight: 46 },
      h1: { fontSize: 34, fontWeight: '700', lineHeight: 39 },
      body: { fontSize: 15, fontWeight: '400', lineHeight: 24 },
      button: { fontSize: 15, fontWeight: '600', lineHeight: 15, letterSpacing: 0.6 },
    },
    shadows: { button: {}, card: {}, cardHover: {} },
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

const mockStyleQuizComplete = jest.fn((..._args: unknown[]) =>
  Promise.resolve({ success: true, newTotal: 100 }),
);
jest.mock('@/hooks/useGamificationEvents', () => ({
  useGamificationEvents: () => ({
    styleQuizComplete: (...args: [string, string]) => mockStyleQuizComplete(...args),
    addToCart: jest.fn(),
    submitReview: jest.fn(),
    referralShared: jest.fn(),
    arUsed: jest.fn(),
    wishlistAdd: jest.fn(),
    orderPlaced: jest.fn(),
  }),
}));

jest.mock('@/hooks/useGamificationReveal', () => ({
  useGamificationReveal: jest.fn(() => ({
    hasSeenReveal: true, // returning user — skip reveal to reach onboarding-completion
    isLoading: false,
    tierData: {
      tierName: 'Trail Blazer',
      points: 150,
      nextTierName: 'Mountain Guide',
      pointsToNextTier: 350,
      progressFraction: 0.3,
    },
    challengeTeasers: [],
    markRevealShown: jest.fn(() => Promise.resolve()),
  })),
  WELCOME_POINTS: 150,
}));

const mockRequestPermission = jest.fn(() => Promise.resolve({ status: 'granted' }));
jest.mock('@/hooks/useNotificationPermission', () => ({
  useNotificationPermission: () => ({
    status: 'undetermined',
    hasAskedBefore: false,
    requestPermission: mockRequestPermission,
    openSettings: jest.fn(),
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function advanceToCompletion(helpers: ReturnType<typeof render>) {
  const { getByTestId } = helpers;
  fireEvent.press(getByTestId('onboarding-next-button'));
  fireEvent.press(getByTestId('onboarding-next-button'));
  fireEvent.press(getByTestId('onboarding-next-button'));
  fireEvent.press(getByTestId('quiz-option-living-room'));
  fireEvent.press(getByTestId('quiz-option-rustic'));
  fireEvent.press(getByTestId('quiz-option-sitting'));
}

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
});

// ─── Skip flow deeper ─────────────────────────────────────────────────────────

describe('skip flow deeper', () => {
  it('skip button on brand slide 2 calls onComplete immediately', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<OnboardingScreen onComplete={onComplete} />);
    fireEvent.press(getByTestId('onboarding-next-button')); // slide 0 → 1
    fireEvent.press(getByTestId('onboarding-next-button')); // slide 1 → 2
    fireEvent.press(getByTestId('onboarding-skip-button'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('skip does not call savePreferences (no AsyncStorage setItem for preferences)', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<OnboardingScreen onComplete={onComplete} />);
    fireEvent.press(getByTestId('onboarding-skip-button'));
    // Only the re-entry guard getItem may be called, but NOT setItem (no preferences saved)
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
      expect.stringContaining('style'),
      expect.anything(),
    );
  });

  it('skip is not shown on the completion step', () => {
    const onComplete = jest.fn();
    const helpers = render(<OnboardingScreen onComplete={onComplete} />);
    advanceToCompletion(helpers);
    const { queryByTestId } = helpers;
    expect(queryByTestId('onboarding-skip-button')).toBeNull();
  });
});

// ─── Back nav deeper ──────────────────────────────────────────────────────────

describe('back nav deeper', () => {
  it('back button is not visible on the first brand slide', () => {
    const onComplete = jest.fn();
    const { queryByTestId } = render(<OnboardingScreen onComplete={onComplete} />);
    expect(queryByTestId('onboarding-back-button')).toBeNull();
  });

  it('back button goes from quiz step 1 back to quiz step 0', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<OnboardingScreen onComplete={onComplete} />);
    // Advance to quiz step 1
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('quiz-option-living-room')); // → quiz step 1
    expect(getByTestId('onboarding-quiz-step-1')).toBeTruthy();
    // Go back
    fireEvent.press(getByTestId('onboarding-back-button'));
    expect(getByTestId('onboarding-quiz-step-0')).toBeTruthy();
  });

  it('back button is hidden on the completion step', () => {
    const onComplete = jest.fn();
    const helpers = render(<OnboardingScreen onComplete={onComplete} />);
    advanceToCompletion(helpers);
    const { queryByTestId } = helpers;
    expect(queryByTestId('onboarding-back-button')).toBeNull();
  });
});

// ─── Permission prompts denied ────────────────────────────────────────────────

describe('permission prompts denied', () => {
  it('requestPermission is called when the completion step is finished', async () => {
    mockRequestPermission.mockResolvedValue({ status: 'denied' });
    const onComplete = jest.fn();
    const helpers = render(<OnboardingScreen onComplete={onComplete} />);
    advanceToCompletion(helpers);
    const { getByTestId } = helpers;
    await act(async () => {
      fireEvent.press(getByTestId('onboarding-get-started-button'));
    });
    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    });
  });

  it('denied permission still calls onComplete', async () => {
    mockRequestPermission.mockResolvedValue({ status: 'denied' });
    const onComplete = jest.fn();
    const helpers = render(<OnboardingScreen onComplete={onComplete} />);
    advanceToCompletion(helpers);
    const { getByTestId } = helpers;
    await act(async () => {
      fireEvent.press(getByTestId('onboarding-get-started-button'));
    });
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('permission request error still calls onComplete', async () => {
    mockRequestPermission.mockRejectedValue(new Error('Permission error'));
    const onComplete = jest.fn();
    const helpers = render(<OnboardingScreen onComplete={onComplete} />);
    advanceToCompletion(helpers);
    const { getByTestId } = helpers;
    await act(async () => {
      fireEvent.press(getByTestId('onboarding-get-started-button'));
    });
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });
});

// ─── Re-entry guard ───────────────────────────────────────────────────────────

describe('re-entry guard', () => {
  it('calls onComplete immediately when AsyncStorage has onboarding_complete = true', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
    const onComplete = jest.fn();
    render(<OnboardingScreen onComplete={onComplete} />);
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('does NOT call onComplete when AsyncStorage returns null', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const onComplete = jest.fn();
    render(<OnboardingScreen onComplete={onComplete} />);
    // Allow effects to settle, then assert not called
    await act(async () => {
      await Promise.resolve();
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('shows onboarding normally when AsyncStorage read fails', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
    const onComplete = jest.fn();
    const helpers = render(<OnboardingScreen onComplete={onComplete} />);
    // Allow rejected promise to settle
    await act(async () => {
      await Promise.resolve();
    });
    expect(onComplete).not.toHaveBeenCalled();
    // Onboarding renders normally
    expect(helpers.getByTestId('onboarding-screen')).toBeTruthy();
  });

  it('persists onboarding_complete to AsyncStorage on finish', async () => {
    const onComplete = jest.fn();
    const helpers = render(<OnboardingScreen onComplete={onComplete} />);
    advanceToCompletion(helpers);
    const { getByTestId } = helpers;
    await act(async () => {
      fireEvent.press(getByTestId('onboarding-get-started-button'));
    });
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('onboarding_complete', 'true');
    });
  });
});
