import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StyleQuizScreen } from '../StyleQuizScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    borderRadius: { button: 8, pill: 9999, card: 12, md: 8 },
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

describe('StyleQuizScreen', () => {
  const mockOnComplete = jest.fn();
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ─────────────────────────────────────────────────

  it('renders the quiz screen', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    expect(getByTestId('style-quiz-screen')).toBeTruthy();
  });

  it('starts on the room type step (step 0)', () => {
    const { getByTestId, getByText } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    expect(getByTestId('style-quiz-step-0')).toBeTruthy();
    expect(getByText(/what room is/i)).toBeTruthy();
  });

  it('renders all four room type options', () => {
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

  // ── Navigation between steps ──────────────────────────────────

  it('auto-advances to style step after selecting room', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    expect(getByTestId('style-quiz-step-1')).toBeTruthy();
  });

  it('auto-advances to primary use step after selecting style', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-bedroom'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    expect(getByTestId('style-quiz-step-2')).toBeTruthy();
  });

  it('shows all four style options on step 1', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    expect(getByTestId('quiz-option-modern')).toBeTruthy();
    expect(getByTestId('quiz-option-rustic')).toBeTruthy();
    expect(getByTestId('quiz-option-classic')).toBeTruthy();
    expect(getByTestId('quiz-option-minimalist')).toBeTruthy();
  });

  it('shows all four use options on step 2', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-studio'));
    fireEvent.press(getByTestId('quiz-option-rustic'));
    expect(getByTestId('quiz-option-seating')).toBeTruthy();
    expect(getByTestId('quiz-option-guest-bed')).toBeTruthy();
    expect(getByTestId('quiz-option-dual-purpose')).toBeTruthy();
    expect(getByTestId('quiz-option-kid-friendly')).toBeTruthy();
  });

  // ── Completion ────────────────────────────────────────────────

  it('shows completion view after all three steps', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-seating'));
    expect(getByTestId('style-quiz-completion')).toBeTruthy();
  });

  it('shows Save Preferences button on completion', () => {
    const { getByTestId, getByText } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-seating'));
    expect(getByTestId('style-quiz-save-button')).toBeTruthy();
    expect(getByText('Save Preferences')).toBeTruthy();
  });

  it('saves preferences and calls onComplete when Save is pressed', async () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-seating'));
    fireEvent.press(getByTestId('style-quiz-save-button'));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@carolina_futons_style_preferences',
        JSON.stringify({
          room: 'living-room',
          style: 'modern',
          primaryUse: 'seating',
        }),
      );
    });
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('displays selected preferences in completion summary', () => {
    const { getByTestId, getByText } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-bedroom'));
    fireEvent.press(getByTestId('quiz-option-rustic'));
    fireEvent.press(getByTestId('quiz-option-dual-purpose'));
    expect(getByTestId('style-quiz-completion')).toBeTruthy();
    expect(getByText(/rustic/i)).toBeTruthy();
  });

  // ── Back navigation ───────────────────────────────────────────

  it('calls onBack when back is pressed on first step', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('style-quiz-back-button'));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('goes to previous step when back is pressed on step > 0', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    expect(getByTestId('style-quiz-step-1')).toBeTruthy();
    fireEvent.press(getByTestId('style-quiz-back-button'));
    expect(getByTestId('style-quiz-step-0')).toBeTruthy();
  });

  it('goes back from completion to step 2', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-seating'));
    expect(getByTestId('style-quiz-completion')).toBeTruthy();
    fireEvent.press(getByTestId('style-quiz-back-button'));
    expect(getByTestId('style-quiz-step-2')).toBeTruthy();
  });

  // ── Edge cases ────────────────────────────────────────────────

  it('handles AsyncStorage write failure gracefully', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage full'));
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    fireEvent.press(getByTestId('quiz-option-modern'));
    fireEvent.press(getByTestId('quiz-option-seating'));
    fireEvent.press(getByTestId('style-quiz-save-button'));

    // Should still call onComplete even if storage fails
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('accepts custom testID', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} testID="custom-quiz" />,
    );
    expect(getByTestId('custom-quiz')).toBeTruthy();
  });

  it('marks selected option with selected state', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    const option = getByTestId('quiz-option-living-room');
    fireEvent.press(option);
    // After selecting, we auto-advance, so go back to verify selection is preserved
    fireEvent.press(getByTestId('style-quiz-back-button'));
    const selectedOption = getByTestId('quiz-option-living-room');
    expect(selectedOption.props.accessibilityState?.selected).toBe(true);
  });

  // ── Accessibility ─────────────────────────────────────────────

  it('options have accessible labels', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    expect(getByTestId('quiz-option-living-room').props.accessibilityLabel).toBe('Living Room');
    expect(getByTestId('quiz-option-bedroom').props.accessibilityLabel).toBe('Bedroom');
  });

  it('options have button role', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    expect(getByTestId('quiz-option-living-room').props.accessibilityRole).toBe('button');
  });

  it('back button has accessible label', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    expect(getByTestId('style-quiz-back-button').props.accessibilityLabel).toBe('Go back');
  });

  // ── Loading previous preferences ──────────────────────────────

  it('loads existing preferences from AsyncStorage on mount', async () => {
    const saved = JSON.stringify({
      room: 'studio',
      style: 'minimalist',
      primaryUse: 'kid-friendly',
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(saved);

    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );

    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@carolina_futons_style_preferences');
    });

    // Should show the quiz at step 0 with studio pre-selected
    const studioOption = getByTestId('quiz-option-studio');
    expect(studioOption.props.accessibilityState?.selected).toBe(true);
  });

  it('handles corrupted AsyncStorage data gracefully', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('not valid json{{{');

    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );

    // Should still render without crashing
    await waitFor(() => {
      expect(getByTestId('style-quiz-screen')).toBeTruthy();
    });
  });

  it('handles AsyncStorage read failure gracefully', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Read error'));

    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );

    // Should still render without crashing
    await waitFor(() => {
      expect(getByTestId('style-quiz-screen')).toBeTruthy();
    });
  });
});
