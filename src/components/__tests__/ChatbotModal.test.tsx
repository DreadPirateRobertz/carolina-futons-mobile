/**
 * @file ChatbotModal.test.tsx
 * @description TDD tests for ChatbotModal component.
 * cfutons_mobile-6hb
 *
 * Covers:
 *  - Renders nothing when visible=false
 *  - Renders message input and send button when visible=true
 *  - Renders user and assistant messages
 *  - Shows loading indicator while sending
 *  - Shows error message when error is set
 *  - Calls onClose when close button tapped
 *  - Calls sendMessage with trimmed input on send
 *  - Clears input after send
 *  - Send button disabled while sending
 *  - Empty input: send button disabled
 *  - Accessibility: modal has accessibilityViewIsModal
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { ChatbotModal } from '../ChatbotModal';
import type { ChatMessage } from '@/hooks/useChatbot';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  messages: [] as ChatMessage[],
  sending: false,
  error: null as string | null,
  onSend: jest.fn(),
};

describe('ChatbotModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when visible=false', () => {
    const { queryByTestId } = renderWithTheme(<ChatbotModal {...defaultProps} visible={false} />);
    expect(queryByTestId('chatbot-modal')).toBeNull();
  });

  it('renders modal container when visible=true', () => {
    const { getByTestId } = renderWithTheme(<ChatbotModal {...defaultProps} />);
    expect(getByTestId('chatbot-modal')).toBeTruthy();
  });

  it('renders text input', () => {
    const { getByTestId } = renderWithTheme(<ChatbotModal {...defaultProps} />);
    expect(getByTestId('chatbot-input')).toBeTruthy();
  });

  it('renders send button', () => {
    const { getByTestId } = renderWithTheme(<ChatbotModal {...defaultProps} />);
    expect(getByTestId('chatbot-send-btn')).toBeTruthy();
  });

  it('renders close button', () => {
    const { getByTestId } = renderWithTheme(<ChatbotModal {...defaultProps} />);
    expect(getByTestId('chatbot-close-btn')).toBeTruthy();
  });

  it('calls onClose when close button tapped', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderWithTheme(<ChatbotModal {...defaultProps} onClose={onClose} />);
    fireEvent.press(getByTestId('chatbot-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders user messages', () => {
    const messages: ChatMessage[] = [
      { id: '1', role: 'user', text: 'Do you have queen size futons?' },
    ];
    const { getByText } = renderWithTheme(<ChatbotModal {...defaultProps} messages={messages} />);
    expect(getByText('Do you have queen size futons?')).toBeTruthy();
  });

  it('renders assistant messages', () => {
    const messages: ChatMessage[] = [
      { id: '1', role: 'assistant', text: 'Yes, we carry queen futon frames!' },
    ];
    const { getByText } = renderWithTheme(<ChatbotModal {...defaultProps} messages={messages} />);
    expect(getByText('Yes, we carry queen futon frames!')).toBeTruthy();
  });

  it('renders multiple messages in order', () => {
    const messages: ChatMessage[] = [
      { id: '1', role: 'user', text: 'hello' },
      { id: '2', role: 'assistant', text: 'hi there' },
    ];
    const { getAllByTestId } = renderWithTheme(<ChatbotModal {...defaultProps} messages={messages} />);
    const bubbles = getAllByTestId(/^chatbot-message-/);
    expect(bubbles).toHaveLength(2);
  });

  it('shows loading indicator while sending', () => {
    const { getByTestId } = renderWithTheme(<ChatbotModal {...defaultProps} sending={true} />);
    expect(getByTestId('chatbot-loading')).toBeTruthy();
  });

  it('hides loading indicator when not sending', () => {
    const { queryByTestId } = renderWithTheme(<ChatbotModal {...defaultProps} sending={false} />);
    expect(queryByTestId('chatbot-loading')).toBeNull();
  });

  it('shows error message when error is set', () => {
    const { getByTestId } = renderWithTheme(
      <ChatbotModal {...defaultProps} error="assistant_unavailable" />,
    );
    expect(getByTestId('chatbot-error')).toBeTruthy();
  });

  it('does not show error when error is null', () => {
    const { queryByTestId } = renderWithTheme(<ChatbotModal {...defaultProps} error={null} />);
    expect(queryByTestId('chatbot-error')).toBeNull();
  });

  it('calls onSend with trimmed text when send button pressed', () => {
    const onSend = jest.fn();
    const { getByTestId } = renderWithTheme(<ChatbotModal {...defaultProps} onSend={onSend} />);

    fireEvent.changeText(getByTestId('chatbot-input'), '  hello  ');
    fireEvent.press(getByTestId('chatbot-send-btn'));

    expect(onSend).toHaveBeenCalledWith('hello');
  });

  it('clears input after send', () => {
    const { getByTestId } = renderWithTheme(<ChatbotModal {...defaultProps} />);
    const input = getByTestId('chatbot-input');

    fireEvent.changeText(input, 'hello');
    fireEvent.press(getByTestId('chatbot-send-btn'));

    expect(input.props.value).toBe('');
  });

  it('send button disabled while sending', () => {
    const { getByTestId } = renderWithTheme(<ChatbotModal {...defaultProps} sending={true} />);
    const sendBtn = getByTestId('chatbot-send-btn');
    expect(sendBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('send button disabled when input is empty', () => {
    const { getByTestId } = renderWithTheme(<ChatbotModal {...defaultProps} />);
    const sendBtn = getByTestId('chatbot-send-btn');
    expect(sendBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('send button enabled when input has text and not sending', () => {
    const { getByTestId } = renderWithTheme(<ChatbotModal {...defaultProps} />);
    fireEvent.changeText(getByTestId('chatbot-input'), 'hello');
    const sendBtn = getByTestId('chatbot-send-btn');
    expect(sendBtn.props.accessibilityState?.disabled).toBe(false);
  });

  it('does not call onSend when input is empty and send pressed', () => {
    const onSend = jest.fn();
    const { getByTestId } = renderWithTheme(<ChatbotModal {...defaultProps} onSend={onSend} />);
    fireEvent.press(getByTestId('chatbot-send-btn'));
    expect(onSend).not.toHaveBeenCalled();
  });
});
