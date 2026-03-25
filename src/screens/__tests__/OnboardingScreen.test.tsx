import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingScreen } from '../OnboardingScreen';
import { useGamificationReveal } from '@/hooks/useGamificationReveal';

// Mock useTheme
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

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock useGamificationEvents — cm-0l2
const mockStyleQuizComplete = jest.fn(() => Promise.resolve({ success: true, newTotal: 100 }));
jest.mock('@/hooks/useGamificationEvents', () => ({
  useGamificationEvents: () => ({
    styleQuizComplete: (a: string, b: string) => mockStyleQuizComplete(a, b),
    addToCart: jest.fn(),
    submitReview: jest.fn(),
    referralShared: jest.fn(),
    arUsed: jest.fn(),
    wishlistAdd: jest.fn(),
    orderPlaced: jest.fn(),
  }),
}));

// Mock useGamificationReveal — first-time user by default
const mockMarkRevealShown = jest.fn(() => Promise.resolve());
jest.mock('@/hooks/useGamificationReveal', () => ({
  useGamificationReveal: jest.fn(() => ({
    hasSeenReveal: false,
    isLoading: false,
    tierData: {
      tierName: 'Trail Blazer',
      points: 150,
      nextTierName: 'Mountain Guide',
      pointsToNextTier: 350,
      progressFraction: 0.3,
    },
    challengeTeasers: [
      { title: 'Make your first purchase', pointsLabel: '+200 pts' },
      { title: 'Complete your style profile', pointsLabel: '+50 pts' },
    ],
    markRevealShown: mockMarkRevealShown,
  })),
  WELCOME_POINTS: 150,
}));

describe('OnboardingScreen', () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Brand Story Phase ─────────────────────────────────────────

  it('renders the first brand slide by default', () => {
    const { getByTestId, getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    expect(getByTestId('onboarding-screen')).toBeTruthy();
    expect(getByTestId('onboarding-brand-slide-0')).toBeTruthy();
    expect(getByText('Carolina Futons')).toBeTruthy();
  });

  it('renders progress bar', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    expect(getByTestId('onboarding-progress-bar')).toBeTruthy();
  });

  it('shows Next button on brand slides', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    expect(getByTestId('onboarding-next-button')).toBeTruthy();
  });

  it('advances through brand slides with Next', () => {
    const { getByTestId, getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    fireEvent.press(getByTestId('onboarding-next-button'));
    expect(getByTestId('onboarding-brand-slide-1')).toBeTruthy();
    expect(getByText(/Blue Ridge/)).toBeTruthy();
  });

  it('advances to third brand slide', () => {
    const { getByTestId, getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    expect(getByTestId('onboarding-brand-slide-2')).toBeTruthy();
    expect(getByText(/Your Space/)).toBeTruthy();
  });

  // ── Style Quiz Phase ──────────────────────────────────────────

  it('shows room quiz after brand slides', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    // Advance past 3 brand slides
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    expect(getByTestId('onboarding-quiz-step-0')).toBeTruthy();
  });

  it('auto-advances when quiz option is selected', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    // Navigate to first quiz step
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    // Select a room option
    fireEvent.press(getByTestId('quiz-option-living-room'));
    // Should auto-advance to style quiz
    expect(getByTestId('onboarding-quiz-step-1')).toBeTruthy();
  });

  it('progresses through all quiz steps to the completion phase', () => {
    const { getByTestId, queryByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    // Navigate to quiz
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    // Answer all quiz questions
    fireEvent.press(getByTestId('quiz-option-bedroom'));
    fireEvent.press(getByTestId('quiz-option-rustic'));
    fireEvent.press(getByTestId('quiz-option-both'));
    // Should reach completion phase — either gamification reveal (first-time) or standard
    const completion =
      queryByTestId('onboarding-gamification-reveal') ?? queryByTestId('onboarding-completion');
    expect(completion).toBeTruthy();
    expect(getByTestId('onboarding-get-started-button')).toBeTruthy();
  });

  // ── Completion Phase ──────────────────────────────────────────

  it('shows Start Shopping on completion step', () => {
    const { getByTestId, getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    // Navigate through entire flow
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('quiz-option-dorm'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-sitting'));
    expect(getByTestId('onboarding-get-started-button')).toBeTruthy();
    expect(getByText('Start Shopping')).toBeTruthy();
  });

  it('calls onComplete when Start Shopping is pressed', async () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    // Navigate through entire flow
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-classic'));
    fireEvent.press(getByTestId('quiz-option-sleeping'));
    fireEvent.press(getByTestId('onboarding-get-started-button'));
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('shows alert and does not call onComplete when savePreferences fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage full'));
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    // Navigate through entire flow to completion
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-classic'));
    fireEvent.press(getByTestId('quiz-option-sleeping'));
    fireEvent.press(getByTestId('onboarding-get-started-button'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Save Failed', expect.any(String), expect.any(Array));
    });
    expect(mockOnComplete).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  // ── Style Quiz Gamification Event (cm-0l2) ─────────────────────

  it('fires styleQuizComplete event when Start Shopping is pressed', async () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={jest.fn()} />);
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-sitting'));
    fireEvent.press(getByTestId('onboarding-get-started-button'));
    await waitFor(() => {
      // Onboarding doesn't collect sizeNeeds — second arg is always ''
      expect(mockStyleQuizComplete).toHaveBeenCalledWith('modern', '');
    });
  });

  it('clears daily-quests cache after styleQuizComplete fires', async () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={jest.fn()} />);
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('quiz-option-bedroom'));
    fireEvent.press(getByTestId('quiz-option-rustic'));
    fireEvent.press(getByTestId('quiz-option-both'));
    fireEvent.press(getByTestId('onboarding-get-started-button'));
    await waitFor(() => {
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('daily-quests');
    });
  });

  it('does not fire styleQuizComplete when skip is pressed (no quiz answers)', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={jest.fn()} />);
    fireEvent.press(getByTestId('onboarding-skip-button'));
    expect(mockStyleQuizComplete).not.toHaveBeenCalled();
  });

  it('handles removeItem rejection gracefully (logs warning, does not throw)', async () => {
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error('storage error'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const onComplete = jest.fn();
    const { getByTestId } = render(<OnboardingScreen onComplete={onComplete} />);
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-sitting'));
    fireEvent.press(getByTestId('onboarding-get-started-button'));
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        '[Onboarding] quest cache clear failed',
        expect.any(Error),
      );
    });
    warnSpy.mockRestore();
  });

  it('still calls onComplete even if styleQuizComplete rejects', async () => {
    mockStyleQuizComplete.mockRejectedValueOnce(new Error('network'));
    const onComplete = jest.fn();
    const { getByTestId } = render(<OnboardingScreen onComplete={onComplete} />);
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-classic'));
    fireEvent.press(getByTestId('quiz-option-sleeping'));
    fireEvent.press(getByTestId('onboarding-get-started-button'));
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  // ── Skip & Back ───────────────────────────────────────────────

  it('shows Skip button that calls onComplete', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    const skipButton = getByTestId('onboarding-skip-button');
    expect(skipButton).toBeTruthy();
    fireEvent.press(skipButton);
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('does not show Skip on completion step', () => {
    const { getByTestId, queryByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    // Navigate to completion
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-sitting'));
    expect(queryByTestId('onboarding-skip-button')).toBeNull();
  });

  it('shows back button after first slide', () => {
    const { getByTestId, queryByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    // No back on first slide
    expect(queryByTestId('onboarding-back-button')).toBeNull();
    // Advance and check
    fireEvent.press(getByTestId('onboarding-next-button'));
    expect(getByTestId('onboarding-back-button')).toBeTruthy();
  });

  it('back button returns to previous step', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    fireEvent.press(getByTestId('onboarding-next-button'));
    expect(getByTestId('onboarding-brand-slide-1')).toBeTruthy();
    fireEvent.press(getByTestId('onboarding-back-button'));
    expect(getByTestId('onboarding-brand-slide-0')).toBeTruthy();
  });

  it('skip works from quiz phase too', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    // Navigate to quiz
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    // Skip from quiz
    fireEvent.press(getByTestId('onboarding-skip-button'));
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });
});

// ── Gamification Reveal ──────────────────────────────────────────────────────

/** Helper: navigate through all brand slides + quiz to reach the completion step. */
function navigateToCompletion(getByTestId: ReturnType<typeof render>['getByTestId']) {
  fireEvent.press(getByTestId('onboarding-next-button')); // slide 1 → 2
  fireEvent.press(getByTestId('onboarding-next-button')); // slide 2 → 3
  fireEvent.press(getByTestId('onboarding-next-button')); // slide 3 → quiz Q1
  fireEvent.press(getByTestId('quiz-option-living-room')); // Q1 → Q2
  fireEvent.press(getByTestId('quiz-option-modern')); // Q2 → Q3
  fireEvent.press(getByTestId('quiz-option-sitting')); // Q3 → completion
}

describe('Gamification Reveal — first-time user', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock: first-time user (hasSeenReveal: false)
    (useGamificationReveal as jest.Mock).mockReturnValue({
      hasSeenReveal: false,
      isLoading: false,
      tierData: {
        tierName: 'Trail Blazer',
        points: 150,
        nextTierName: 'Mountain Guide',
        pointsToNextTier: 350,
        progressFraction: 0.3,
      },
      challengeTeasers: [
        { title: 'Make your first purchase', pointsLabel: '+200 pts' },
        { title: 'Complete your style profile', pointsLabel: '+50 pts' },
      ],
      markRevealShown: mockMarkRevealShown,
    });
  });

  it('shows gamification reveal slide instead of standard completion', () => {
    const { getByTestId, queryByTestId } = render(<OnboardingScreen onComplete={jest.fn()} />);
    navigateToCompletion(getByTestId);
    expect(getByTestId('onboarding-gamification-reveal')).toBeTruthy();
    expect(queryByTestId('onboarding-completion')).toBeNull();
  });

  it('shows WELCOME_POINTS in the headline', () => {
    const { getByTestId, getByText } = render(<OnboardingScreen onComplete={jest.fn()} />);
    navigateToCompletion(getByTestId);
    expect(getByText(/150 welcome points/i)).toBeTruthy();
  });

  it('renders 2 challenge teasers', () => {
    const { getByTestId, getAllByTestId } = render(<OnboardingScreen onComplete={jest.fn()} />);
    navigateToCompletion(getByTestId);
    expect(getAllByTestId('gamification-reveal-challenge-teaser')).toHaveLength(2);
  });

  it('renders tier badge with welcome points', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={jest.fn()} />);
    navigateToCompletion(getByTestId);
    expect(getByTestId('gamification-reveal-tier-badge')).toBeTruthy();
  });

  it('calls markRevealShown when completion step mounts', async () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={jest.fn()} />);
    navigateToCompletion(getByTestId);
    await waitFor(() => {
      expect(mockMarkRevealShown).toHaveBeenCalledTimes(1);
    });
  });

  it('still calls onComplete when Start Shopping is pressed', async () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<OnboardingScreen onComplete={onComplete} />);
    navigateToCompletion(getByTestId);
    fireEvent.press(getByTestId('onboarding-get-started-button'));
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Gamification Reveal — returning user (hasSeenReveal: true)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useGamificationReveal as jest.Mock).mockReturnValue({
      hasSeenReveal: true,
      isLoading: false,
      tierData: {
        tierName: 'Trail Blazer',
        points: 150,
        nextTierName: 'Mountain Guide',
        pointsToNextTier: 350,
        progressFraction: 0.3,
      },
      challengeTeasers: [],
      markRevealShown: mockMarkRevealShown,
    });
  });

  it('shows standard completion instead of reveal when hasSeenReveal is true', () => {
    const { getByTestId, queryByTestId } = render(<OnboardingScreen onComplete={jest.fn()} />);
    navigateToCompletion(getByTestId);
    expect(getByTestId('onboarding-completion')).toBeTruthy();
    expect(queryByTestId('onboarding-gamification-reveal')).toBeNull();
  });

  it('does not call markRevealShown when reveal already seen', async () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={jest.fn()} />);
    navigateToCompletion(getByTestId);
    await waitFor(() => {}, { timeout: 200 });
    expect(mockMarkRevealShown).not.toHaveBeenCalled();
  });
});
