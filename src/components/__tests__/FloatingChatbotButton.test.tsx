/**
 * @file FloatingChatbotButton.test.tsx
 * @description TDD tests for FloatingChatbotButton component.
 * cfutons_mobile-6hb
 *
 * Covers:
 *  - Renders the floating button
 *  - Calls onPress when tapped
 *  - Has accessible label
 *  - Does not render when hidden=true
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { FloatingChatbotButton } from '../FloatingChatbotButton';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('FloatingChatbotButton', () => {
  it('renders the floating button', () => {
    const { getByTestId } = renderWithTheme(<FloatingChatbotButton onPress={jest.fn()} />);
    expect(getByTestId('floating-chatbot-btn')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithTheme(<FloatingChatbotButton onPress={onPress} />);
    fireEvent.press(getByTestId('floating-chatbot-btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has accessible label', () => {
    const { getByTestId } = renderWithTheme(<FloatingChatbotButton onPress={jest.fn()} />);
    const btn = getByTestId('floating-chatbot-btn');
    expect(btn.props.accessibilityLabel).toBeTruthy();
  });

  it('does not render when hidden=true', () => {
    const { queryByTestId } = renderWithTheme(
      <FloatingChatbotButton onPress={jest.fn()} hidden={true} />,
    );
    expect(queryByTestId('floating-chatbot-btn')).toBeNull();
  });

  it('renders by default (hidden=false)', () => {
    const { getByTestId } = renderWithTheme(<FloatingChatbotButton onPress={jest.fn()} />);
    expect(getByTestId('floating-chatbot-btn')).toBeTruthy();
  });
});
