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

/** Press through all 5 quiz steps to reach the completion screen. */
function completeQuiz(getByTestId: ReturnType<typeof render>['getByTestId']) {
  fireEvent.press(getByTestId('quiz-option-living-room')); // room
  fireEvent.press(getByTestId('quiz-option-modern')); // style
  fireEvent.press(getByTestId('quiz-option-seating')); // primaryUse
  fireEvent.press(getByTestId('quiz-option-cool')); // colorPalette
  fireEvent.press(getByTestId('quiz-option-standard')); // sizePreference
}

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

  it('auto-advances to color palette step after primary use selection', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-studio'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-dual-purpose'));
    expect(getByTestId('style-quiz-step-3')).toBeTruthy();
  });

  it('renders color palette options on step 3', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-seating'));
    expect(getByTestId('quiz-option-warm')).toBeTruthy();
    expect(getByTestId('quiz-option-cool')).toBeTruthy();
    expect(getByTestId('quiz-option-neutral')).toBeTruthy();
    expect(getByTestId('quiz-option-bold')).toBeTruthy();
  });

  it('auto-advances to size preference step after color palette selection', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-seating'));
    fireEvent.press(getByTestId('quiz-option-cool'));
    expect(getByTestId('style-quiz-step-4')).toBeTruthy();
  });

  it('renders size preference options on step 4', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-seating'));
    fireEvent.press(getByTestId('quiz-option-cool'));
    expect(getByTestId('quiz-option-apartment')).toBeTruthy();
    expect(getByTestId('quiz-option-standard')).toBeTruthy();
    expect(getByTestId('quiz-option-oversized')).toBeTruthy();
    expect(getByTestId('quiz-option-custom')).toBeTruthy();
  });

  it('shows completion after all 5 questions answered', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    completeQuiz(getByTestId);
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
    completeQuiz(getByTestId);
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
    fireEvent.press(getByTestId('quiz-option-neutral'));
    fireEvent.press(getByTestId('quiz-option-apartment'));
    fireEvent.press(getByTestId('style-quiz-save-button'));
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith(
        '@carolina_futons_style_preferences',
        JSON.stringify({
          room: 'bedroom',
          style: 'minimalist',
          primaryUse: 'seating',
          colorPalette: 'neutral',
          sizePreference: 'apartment',
        }),
      );
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  // ── Personality label ────────────────────────────────────────────

  it('shows personality label on completion', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    completeQuiz(getByTestId); // modern + cool → Coastal Minimalist
    expect(getByTestId('style-quiz-personality-label')).toBeTruthy();
  });

  it('personality label shows Coastal Minimalist for modern + cool', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    completeQuiz(getByTestId); // living-room, modern, seating, cool, standard
    const label = getByTestId('style-quiz-personality-label');
    expect(label.props.children).toContain('Coastal Minimalist');
  });

  it('personality label shows Warm Industrial for rustic + warm', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-rustic'));
    fireEvent.press(getByTestId('quiz-option-guest-bed'));
    fireEvent.press(getByTestId('quiz-option-warm'));
    fireEvent.press(getByTestId('quiz-option-standard'));
    const label = getByTestId('style-quiz-personality-label');
    expect(label.props.children).toContain('Warm Industrial');
  });

  // ── Product grid ─────────────────────────────────────────────────

  it('renders curated product grid on completion', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    completeQuiz(getByTestId);
    expect(getByTestId('style-quiz-product-grid')).toBeTruthy();
  });

  it('product grid has at least one product card', () => {
    const { getByTestId, getAllByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    completeQuiz(getByTestId);
    const cards = getAllByTestId(/^quiz-product-/);
    expect(cards.length).toBeGreaterThan(0);
  });

  it('calls onProductPress with slug when product card tapped', () => {
    const onProductPress = jest.fn();
    const { getByTestId, getAllByTestId } = render(
      <StyleQuizScreen
        onComplete={mockOnComplete}
        onBack={mockOnBack}
        onProductPress={onProductPress}
      />,
    );
    completeQuiz(getByTestId);
    const cards = getAllByTestId(/^quiz-product-/);
    fireEvent.press(cards[0]);
    expect(onProductPress).toHaveBeenCalledTimes(1);
    expect(typeof onProductPress.mock.calls[0][0]).toBe('string');
  });

  it('does not throw when onProductPress not provided and product tapped', () => {
    const { getByTestId, getAllByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    completeQuiz(getByTestId);
    const cards = getAllByTestId(/^quiz-product-/);
    expect(() => fireEvent.press(cards[0])).not.toThrow();
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
    completeQuiz(getByTestId);
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
    fireEvent.press(getByTestId('quiz-option-warm'));
    fireEvent.press(getByTestId('quiz-option-standard'));
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
