/**
 * OnboardingScreen edge-case tests — cm-bhs
 *
 * Covers gaps in onboardingScreen.test.tsx / onboardingScreen.deeper.test.tsx:
 *  - Step navigation bounds (progress label, back across phase boundaries)
 *  - Skip flow from mid-quiz steps (quiz step 1, quiz step 2)
 *  - Network error on account create (savePreferences network failure)
 *  - Fire-and-forget completion key failure (onComplete still called)
 *  - Animation interrupt (reduceMotion=true, progressFraction bounds, nextTierName null)
 *  - Completion content (selected style label, tier progress label)
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingScreen } from '../OnboardingScreen';
import { useGamificationReveal } from '@/hooks/useGamificationReveal';

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

jest.mock('@/hooks/useGamificationEvents', () => ({
  useGamificationEvents: () => ({
    styleQuizComplete: jest.fn(() => Promise.resolve({ success: true, newTotal: 100 })),
    addToCart: jest.fn(),
    submitReview: jest.fn(),
    referralShared: jest.fn(),
    arUsed: jest.fn(),
    wishlistAdd: jest.fn(),
    orderPlaced: jest.fn(),
  }),
}));

const mockMarkRevealShown = jest.fn(() => Promise.resolve());

jest.mock('@/hooks/useGamificationReveal', () => ({
  useGamificationReveal: jest.fn(() => ({
    hasSeenReveal: true, // returning user by default → onboarding-completion
    isLoading: false,
    tierData: {
      tierName: 'Trail Blazer',
      points: 150,
      nextTierName: 'Mountain Guide',
      pointsToNextTier: 350,
      progressFraction: 0.3,
    },
    challengeTeasers: [{ title: 'Make your first purchase', pointsLabel: '+200 pts' }],
    markRevealShown: mockMarkRevealShown,
  })),
  WELCOME_POINTS: 150,
}));

jest.mock('@/hooks/useNotificationPermission', () => ({
  useNotificationPermission: () => ({
    status: 'undetermined',
    hasAskedBefore: false,
    requestPermission: jest.fn(() => Promise.resolve({ status: 'granted' })),
    openSettings: jest.fn(),
  }),
}));

const mockUseReducedMotion = jest.fn<boolean, []>(() => false);
jest.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function advanceToCompletion(getByTestId: ReturnType<typeof render>['getByTestId']) {
  fireEvent.press(getByTestId('onboarding-next-button')); // slide 0 → 1
  fireEvent.press(getByTestId('onboarding-next-button')); // slide 1 → 2
  fireEvent.press(getByTestId('onboarding-next-button')); // slide 2 → quiz Q0
  fireEvent.press(getByTestId('quiz-option-living-room')); // Q0 → Q1
  fireEvent.press(getByTestId('quiz-option-rustic')); // Q1 → Q2
  fireEvent.press(getByTestId('quiz-option-sitting')); // Q2 → completion
}

const BASE_TIER_DATA = {
  tierName: 'Trail Blazer',
  points: 150,
  nextTierName: 'Mountain Guide' as string | null,
  pointsToNextTier: 350,
  progressFraction: 0.3,
};

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  mockUseReducedMotion.mockReturnValue(false);
  (useGamificationReveal as jest.Mock).mockReturnValue({
    hasSeenReveal: true,
    isLoading: false,
    tierData: BASE_TIER_DATA,
    challengeTeasers: [{ title: 'Make your first purchase', pointsLabel: '+200 pts' }],
    markRevealShown: mockMarkRevealShown,
  });
});

// ─── Step navigation bounds ───────────────────────────────────────────────────

describe('step navigation bounds', () => {
  it('progress label shows "1 / 7" on the first brand slide', () => {
    const { getByText } = render(<OnboardingScreen onComplete={jest.fn()} />);
    expect(getByText('1 / 7')).toBeTruthy();
  });

  it('progress label shows "7 / 7" on the completion step', () => {
    const { getByTestId, getByText } = render(<OnboardingScreen onComplete={jest.fn()} />);
    advanceToCompletion(getByTestId);
    expect(getByText('7 / 7')).toBeTruthy();
  });

  it('back from the first quiz step returns to the last brand slide', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={jest.fn()} />);
    // Advance to quiz step 0
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    expect(getByTestId('onboarding-quiz-step-0')).toBeTruthy();
    // Back → last brand slide (index 2)
    fireEvent.press(getByTestId('onboarding-back-button'));
    expect(getByTestId('onboarding-brand-slide-2')).toBeTruthy();
  });

  it('back from quiz step 2 returns to quiz step 1', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={jest.fn()} />);
    // Advance to quiz step 2
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('quiz-option-living-room')); // → Q1
    fireEvent.press(getByTestId('quiz-option-modern')); // → Q2
    expect(getByTestId('onboarding-quiz-step-2')).toBeTruthy();
    fireEvent.press(getByTestId('onboarding-back-button'));
    expect(getByTestId('onboarding-quiz-step-1')).toBeTruthy();
  });

  it('back button is present on quiz step 2', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={jest.fn()} />);
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    expect(getByTestId('onboarding-back-button')).toBeTruthy();
  });
});

// ─── Skip flow from mid-quiz steps ───────────────────────────────────────────

describe('skip flow from mid-quiz steps', () => {
  it('skip from quiz step 1 calls onComplete immediately', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<OnboardingScreen onComplete={onComplete} />);
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('quiz-option-living-room')); // → quiz step 1
    fireEvent.press(getByTestId('onboarding-skip-button'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('skip from quiz step 2 calls onComplete immediately', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<OnboardingScreen onComplete={onComplete} />);
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('quiz-option-living-room')); // → quiz step 1
    fireEvent.press(getByTestId('quiz-option-modern')); // → quiz step 2
    fireEvent.press(getByTestId('onboarding-skip-button'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('skip from quiz step 1 does not persist style preference', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={jest.fn()} />);
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('onboarding-skip-button'));
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
      expect.stringContaining('style'),
      expect.anything(),
    );
  });
});

// ─── Network error on account create ─────────────────────────────────────────

describe('network error on account create', () => {
  it('network timeout on savePreferences shows Save Failed alert', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));
    const onComplete = jest.fn();
    const { getByTestId } = render(<OnboardingScreen onComplete={onComplete} />);
    advanceToCompletion(getByTestId);
    await act(async () => {
      fireEvent.press(getByTestId('onboarding-get-started-button'));
    });
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Save Failed', expect.any(String), expect.any(Array));
    });
    expect(onComplete).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('fire-and-forget onboarding_complete setItem failure does not prevent onComplete', async () => {
    // First setItem: savePreferences (style preferences key) — succeeds
    // Second setItem: onboarding_complete — fails silently (fire-and-forget)
    (AsyncStorage.setItem as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('quota exceeded'));
    const onComplete = jest.fn();
    const { getByTestId } = render(<OnboardingScreen onComplete={onComplete} />);
    advanceToCompletion(getByTestId);
    await act(async () => {
      fireEvent.press(getByTestId('onboarding-get-started-button'));
    });
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('connection refused error on savePreferences shows Save Failed alert and blocks onComplete', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
      new Error('ECONNREFUSED: connection refused'),
    );
    const onComplete = jest.fn();
    const { getByTestId } = render(<OnboardingScreen onComplete={onComplete} />);
    advanceToCompletion(getByTestId);
    await act(async () => {
      fireEvent.press(getByTestId('onboarding-get-started-button'));
    });
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledTimes(1);
    });
    expect(onComplete).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

// ─── Animation interrupt ─────────────────────────────────────────────────────

describe('animation interrupt', () => {
  beforeEach(() => {
    (useGamificationReveal as jest.Mock).mockReturnValue({
      hasSeenReveal: false, // first-time user → gamification reveal
      isLoading: false,
      tierData: { ...BASE_TIER_DATA },
      challengeTeasers: [{ title: 'Make your first purchase', pointsLabel: '+200 pts' }],
      markRevealShown: mockMarkRevealShown,
    });
  });

  it('tier bar renders on gamification reveal with reduceMotion=true (instant animation)', async () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { getByTestId } = render(<OnboardingScreen onComplete={jest.fn()} />);
    advanceToCompletion(getByTestId);
    await act(async () => {});
    expect(getByTestId('gamification-reveal-tier-bar')).toBeTruthy();
  });

  it('tier progress bar absent when nextTierName is null (max tier reached)', async () => {
    (useGamificationReveal as jest.Mock).mockReturnValue({
      hasSeenReveal: false,
      isLoading: false,
      tierData: {
        tierName: 'Summit Master',
        points: 5000,
        nextTierName: null,
        pointsToNextTier: 0,
        progressFraction: 1,
      },
      challengeTeasers: [],
      markRevealShown: mockMarkRevealShown,
    });
    const { getByTestId, queryByTestId } = render(<OnboardingScreen onComplete={jest.fn()} />);
    advanceToCompletion(getByTestId);
    await act(async () => {});
    expect(queryByTestId('gamification-reveal-tier-bar')).toBeNull();
    // No progress label either
    expect(queryByTestId('gamification-reveal-tier-progress-label')).toBeNull();
  });

  it('tier bar renders without crash when progressFraction is 0', async () => {
    (useGamificationReveal as jest.Mock).mockReturnValue({
      hasSeenReveal: false,
      isLoading: false,
      tierData: { ...BASE_TIER_DATA, progressFraction: 0 },
      challengeTeasers: [],
      markRevealShown: mockMarkRevealShown,
    });
    const { getByTestId } = render(<OnboardingScreen onComplete={jest.fn()} />);
    advanceToCompletion(getByTestId);
    await act(async () => {});
    expect(getByTestId('gamification-reveal-tier-bar')).toBeTruthy();
  });

  it('tier bar renders without crash when progressFraction is 1', async () => {
    (useGamificationReveal as jest.Mock).mockReturnValue({
      hasSeenReveal: false,
      isLoading: false,
      tierData: { ...BASE_TIER_DATA, progressFraction: 1, pointsToNextTier: 0 },
      challengeTeasers: [],
      markRevealShown: mockMarkRevealShown,
    });
    const { getByTestId } = render(<OnboardingScreen onComplete={jest.fn()} />);
    advanceToCompletion(getByTestId);
    await act(async () => {});
    expect(getByTestId('gamification-reveal-tier-bar')).toBeTruthy();
  });

  it('empty challengeTeasers renders no teaser rows', async () => {
    (useGamificationReveal as jest.Mock).mockReturnValue({
      hasSeenReveal: false,
      isLoading: false,
      tierData: { ...BASE_TIER_DATA },
      challengeTeasers: [],
      markRevealShown: mockMarkRevealShown,
    });
    const { getByTestId, queryAllByTestId } = render(<OnboardingScreen onComplete={jest.fn()} />);
    advanceToCompletion(getByTestId);
    await act(async () => {});
    expect(queryAllByTestId('gamification-reveal-challenge-teaser')).toHaveLength(0);
  });

  it('pressing Start Shopping while animation is in flight calls onComplete', async () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<OnboardingScreen onComplete={onComplete} />);
    advanceToCompletion(getByTestId);
    // Press immediately without waiting for the 800ms animation to settle
    fireEvent.press(getByTestId('onboarding-get-started-button'));
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });
});

// ─── Completion content ───────────────────────────────────────────────────────

describe('completion content', () => {
  it('standard completion body text shows the selected style label', () => {
    const { getByTestId, getByText } = render(<OnboardingScreen onComplete={jest.fn()} />);
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-rustic')); // style = Rustic & Warm
    fireEvent.press(getByTestId('quiz-option-sitting'));
    // Body should include lowercased style label
    expect(getByText(/rustic & warm/i)).toBeTruthy();
  });

  it('standard completion body text shows "modern & clean" when modern selected', () => {
    const { getByTestId, getByText } = render(<OnboardingScreen onComplete={jest.fn()} />);
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern')); // style = Modern & Clean
    fireEvent.press(getByTestId('quiz-option-sitting'));
    expect(getByText(/modern & clean/i)).toBeTruthy();
  });

  it('gamification reveal tier progress label shows pts to next tier', async () => {
    (useGamificationReveal as jest.Mock).mockReturnValue({
      hasSeenReveal: false,
      isLoading: false,
      tierData: {
        ...BASE_TIER_DATA,
        nextTierName: 'Mountain Guide',
        pointsToNextTier: 350,
      },
      challengeTeasers: [],
      markRevealShown: mockMarkRevealShown,
    });
    const { getByTestId, getByText } = render(<OnboardingScreen onComplete={jest.fn()} />);
    advanceToCompletion(getByTestId);
    await act(async () => {});
    expect(getByText(/350 pts to Mountain Guide/i)).toBeTruthy();
  });
});
