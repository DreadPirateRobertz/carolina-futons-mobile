import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleQuizScreen } from '../StyleQuizScreen';

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
    borderRadius: { button: 8, pill: 9999, card: 12, md: 8 },
    typography: {
      headingFamily: 'PlayfairDisplay_700Bold',
      bodyFamily: 'SourceSans3_400Regular',
      bodyFamilySemiBold: 'SourceSans3_600SemiBold',
    },
    shadows: { button: {}, card: {}, cardHover: {} },
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
}));

const mockSetItem = AsyncStorage.setItem as jest.Mock;

describe('StyleQuizScreen', () => {
  const mockOnComplete = jest.fn();
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ───────────────────────────────────────────────────

  it('renders the first quiz step (room) by default', () => {
    const { getByTestId, getByText } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    expect(getByTestId('style-quiz-screen')).toBeTruthy();
    expect(getByTestId('style-quiz-step-0')).toBeTruthy();
    expect(getByText(/what room/i)).toBeTruthy();
  });

  it('renders all room options', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    expect(getByTestId('quiz-option-living-room')).toBeTruthy();
    expect(getByTestId('quiz-option-bedroom')).toBeTruthy();
    expect(getByTestId('quiz-option-studio')).toBeTruthy();
    expect(getByTestId('quiz-option-guest-room')).toBeTruthy();
  });

  it('renders progress indicator', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    expect(getByTestId('style-quiz-progress')).toBeTruthy();
  });

  it('renders back button', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    expect(getByTestId('style-quiz-back-button')).toBeTruthy();
  });

  // ── Navigation ──────────────────────────────────────────────────

  it('auto-advances to style step after room selection', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    expect(getByTestId('style-quiz-step-1')).toBeTruthy();
  });

  it('auto-advances to primary use step after style selection', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-bedroom'));
    fireEvent.press(getByTestId('quiz-option-rustic'));
    expect(getByTestId('style-quiz-step-2')).toBeTruthy();
  });

  it('shows completion after all questions answered', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-studio'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-dual-purpose'));
    expect(getByTestId('style-quiz-completion')).toBeTruthy();
  });

  it('back button on first step calls onBack prop', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('style-quiz-back-button'));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('back button on later steps returns to previous quiz step', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    expect(getByTestId('style-quiz-step-1')).toBeTruthy();
    fireEvent.press(getByTestId('style-quiz-back-button'));
    expect(getByTestId('style-quiz-step-0')).toBeTruthy();
    expect(mockOnBack).not.toHaveBeenCalled();
  });

  // ── Completion ──────────────────────────────────────────────────

  it('shows Save Preferences button on completion', () => {
    const { getByTestId, getByText } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-guest-room'));
    fireEvent.press(getByTestId('quiz-option-classic'));
    fireEvent.press(getByTestId('quiz-option-kid-friendly'));
    expect(getByText('Save Preferences')).toBeTruthy();
    expect(getByTestId('style-quiz-save-button')).toBeTruthy();
  });

  it('saves preferences and calls onComplete when Save is pressed', async () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-bedroom'));
    fireEvent.press(getByTestId('quiz-option-minimalist'));
    fireEvent.press(getByTestId('quiz-option-seating'));
    fireEvent.press(getByTestId('style-quiz-save-button'));
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith(
        '@carolina_futons_style_preferences',
        JSON.stringify({ room: 'bedroom', style: 'minimalist', primaryUse: 'seating' }),
      );
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  // ── Accessibility ───────────────────────────────────────────────

  it('quiz options have accessible labels', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    const option = getByTestId('quiz-option-living-room');
    expect(option.props.accessibilityLabel).toBe('Living Room');
    expect(option.props.accessibilityRole).toBe('button');
  });

  it('back button has accessible label', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    const backBtn = getByTestId('style-quiz-back-button');
    expect(backBtn.props.accessibilityLabel).toBe('Go back');
    expect(backBtn.props.accessibilityRole).toBe('button');
  });

  // ── Edge Cases ──────────────────────────────────────────────────

  it('handles AsyncStorage write failure gracefully', async () => {
    mockSetItem.mockRejectedValue(new Error('Storage full'));
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-seating'));
    fireEvent.press(getByTestId('style-quiz-save-button'));
    // Should still complete even if storage fails
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('shows personalized completion message with selected style', () => {
    const { getByTestId, getByText } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-rustic'));
    fireEvent.press(getByTestId('quiz-option-guest-bed'));
    expect(getByTestId('style-quiz-completion')).toBeTruthy();
    expect(getByText(/rustic/i)).toBeTruthy();
  });

  it('renders with custom testID', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} testID="custom-quiz" />,
    );
    expect(getByTestId('custom-quiz')).toBeTruthy();
  });
});
