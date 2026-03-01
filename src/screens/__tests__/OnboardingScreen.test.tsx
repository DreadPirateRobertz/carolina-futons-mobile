import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OnboardingScreen } from '../OnboardingScreen';

// Mock useTheme
jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sandBase: '#E8D5B7',
      sandLight: '#F2E8D5',
      espresso: '#3A2518',
      espressoLight: '#5C4033',
      sunsetCoral: '#E8845C',
      mountainBlue: '#5B8FA8',
      white: '#FFFFFF',
      muted: '#999999',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    borderRadius: { button: 8, pill: 9999 },
    typography: {
      headingFamily: 'PlayfairDisplay_700Bold',
      bodyFamily: 'SourceSans3_400Regular',
      heroTitle: { fontSize: 36, fontWeight: '700', lineHeight: 40 },
      h2: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
      body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
      button: { fontSize: 15, fontWeight: '600', lineHeight: 15, letterSpacing: 0.5 },
    },
    shadows: { button: {} },
  }),
}));

describe('OnboardingScreen', () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the first slide by default', () => {
    const { getByTestId, getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    expect(getByTestId('onboarding-screen')).toBeTruthy();
    expect(getByText('Welcome to Carolina Futons')).toBeTruthy();
  });

  it('renders pagination dots matching slide count', () => {
    const { getAllByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    const dots = getAllByTestId(/^onboarding-dot-/);
    expect(dots.length).toBeGreaterThanOrEqual(3);
  });

  it('shows active dot for current slide', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    expect(getByTestId('onboarding-dot-0')).toBeTruthy();
  });

  it('shows Next button on non-final slides', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    expect(getByTestId('onboarding-next-button')).toBeTruthy();
  });

  it('advances to next slide when Next is pressed', () => {
    const { getByTestId, getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    fireEvent.press(getByTestId('onboarding-next-button'));
    // Should now show second slide content
    expect(getByText('See It In Your Space')).toBeTruthy();
  });

  it('shows Get Started button on final slide', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    // Navigate to last slide
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    expect(getByTestId('onboarding-get-started-button')).toBeTruthy();
  });

  it('calls onComplete when Get Started is pressed', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-get-started-button'));
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('shows Skip button that calls onComplete', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    const skipButton = getByTestId('onboarding-skip-button');
    expect(skipButton).toBeTruthy();
    fireEvent.press(skipButton);
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('does not show Skip on final slide', () => {
    const { getByTestId, queryByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    fireEvent.press(getByTestId('onboarding-next-button'));
    fireEvent.press(getByTestId('onboarding-next-button'));
    expect(queryByTestId('onboarding-skip-button')).toBeNull();
  });
});
