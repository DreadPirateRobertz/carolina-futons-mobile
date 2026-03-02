import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { OnboardingScreen } from '../OnboardingScreen';

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
    borderRadius: { button: 8, pill: 9999, card: 12 },
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

  it('progresses through all quiz steps', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    // Navigate to quiz
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    // Answer all quiz questions
    fireEvent.press(getByTestId('quiz-option-bedroom'));
    fireEvent.press(getByTestId('quiz-option-rustic'));
    fireEvent.press(getByTestId('quiz-option-dual-purpose'));
    // Should reach completion
    expect(getByTestId('onboarding-completion')).toBeTruthy();
  });

  // ── Completion Phase ──────────────────────────────────────────

  it('shows Start Shopping on completion step', () => {
    const { getByTestId, getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    // Navigate through entire flow
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('quiz-option-studio'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-seating'));
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
    fireEvent.press(getByTestId('quiz-option-guest-bed'));
    fireEvent.press(getByTestId('onboarding-get-started-button'));
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
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
    const { getByTestId, queryByTestId } = render(
      <OnboardingScreen onComplete={mockOnComplete} />,
    );
    // Navigate to completion
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-seating'));
    expect(queryByTestId('onboarding-skip-button')).toBeNull();
  });

  it('shows back button after first slide', () => {
    const { getByTestId, queryByTestId } = render(
      <OnboardingScreen onComplete={mockOnComplete} />,
    );
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
