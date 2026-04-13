/**
 * StyleQuizScreen crossRig push dispatch tests — cm-3hg
 *
 * Verifies that dispatchCrossRigPush fires with badge_earned
 * when the style quiz is completed and saved.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { StyleQuizScreen } from '../StyleQuizScreen';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/services/crossRigPushDispatch', () => ({
  dispatchCrossRigPush: jest.fn(() => Promise.resolve({ sent: 1, failed: 0 })),
  PUSH_EVENTS: { BADGE_EARNED: 'badge_earned', TIER_CHANGED: 'tier_changed' },
}));
const mockDispatch = jest.requireMock('@/services/crossRigPushDispatch')
  .dispatchCrossRigPush as jest.Mock;

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

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
    darkPalette: {},
  }),
}));

jest.mock('@/theme/tokens', () => ({ darkPalette: {} }));

jest.mock('@/components/GlassCard', () => {
  const { View } = require('react-native');
  const { createElement } = require('react');
  return { GlassCard: ({ children, ...props }: any) => createElement(View, props, children) };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Step through all 3 quiz options and then press Save on the completion screen. */
async function completeQuiz(getByTestId: ReturnType<typeof render>['getByTestId']) {
  // Step 0: Room type
  fireEvent.press(getByTestId('quiz-option-living-room'));
  // Step 1: Style preference
  fireEvent.press(getByTestId('quiz-option-modern'));
  // Step 2: Primary use
  fireEvent.press(getByTestId('quiz-option-seating'));
  // Step 3: completion — press Save
  await act(async () => {
    fireEvent.press(getByTestId('style-quiz-save-button'));
    await new Promise((r) => setTimeout(r, 10));
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StyleQuizScreen — crossRig push dispatch (badge_earned)', () => {
  const mockOnComplete = jest.fn();
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls dispatchCrossRigPush with badge_earned when quiz is saved', async () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    await completeQuiz(getByTestId);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.any(String),
      'badge_earned',
      expect.objectContaining({ badgeId: expect.any(String) }),
    );
  });

  it('does NOT call dispatchCrossRigPush on quiz step advance (only on save)', () => {
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    fireEvent.press(getByTestId('quiz-option-living-room'));
    expect(mockDispatch).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('quiz-option-modern'));
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('calls onComplete even when dispatchCrossRigPush rejects', async () => {
    mockDispatch.mockRejectedValueOnce(new Error('push failed'));
    const { getByTestId } = render(
      <StyleQuizScreen onComplete={mockOnComplete} onBack={mockOnBack} />,
    );
    await completeQuiz(getByTestId);
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });
});
