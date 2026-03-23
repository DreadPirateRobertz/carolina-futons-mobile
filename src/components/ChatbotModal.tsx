/**
 * @module ChatbotModal
 *
 * Phase 3 ChatbotUI — slide-up modal sheet with chat interface.
 *
 * Renders a bottom sheet with scrollable message history, a text input,
 * and a send button. Accepts messages + sending/error state as props so
 * the parent can wire in useChatbot().
 *
 * cfutons_mobile-6hb
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import type { ChatMessage } from '@/hooks/useChatbot';

interface Props {
  visible: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
  onSend: (text: string) => void;
}

const ERROR_LABELS: Record<string, string> = {
  assistant_unavailable: 'Assistant unavailable. Please try again.',
  rate_limit_exceeded: "You've sent too many messages. Please wait a moment.",
  auth_required: 'Please sign in to chat with the assistant.',
  feature_disabled: 'Chat assistant is not available yet.',
};

export function ChatbotModal({ visible, onClose, messages, sending, error, onSend }: Props) {
  const { colors, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const canSend = input.trim().length > 0 && !sending;

  useEffect(() => {
    if (messages.length > 0) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  }, [input, onSend]);

  if (!visible) return null;

  const errorLabel = error ? (ERROR_LABELS[error] ?? 'Something went wrong. Please try again.') : null;

  const s = styles(colors, spacing, borderRadius, insets);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
      testID="chatbot-modal"
    >
      <View style={s.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.sheet}
        >
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Carolina Futons Assistant</Text>
            <TouchableOpacity
              onPress={onClose}
              testID="chatbot-close-btn"
              accessibilityLabel="Close assistant"
              accessibilityRole="button"
              style={s.closeBtn}
            >
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={s.messageList}
            contentContainerStyle={s.messageListContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 && (
              <Text style={s.emptyHint}>Ask me anything about our futons, orders, or your account.</Text>
            )}
            {messages.map((msg) => (
              <View
                key={msg.id}
                testID={`chatbot-message-${msg.id}`}
                style={[s.bubble, msg.role === 'user' ? s.userBubble : s.assistantBubble]}
              >
                <Text style={msg.role === 'user' ? s.userText : s.assistantText}>{msg.text}</Text>
              </View>
            ))}
            {sending && (
              <View style={s.loadingRow} testID="chatbot-loading">
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={s.loadingText}>Thinking…</Text>
              </View>
            )}
          </ScrollView>

          {/* Error */}
          {errorLabel && (
            <View style={s.errorRow} testID="chatbot-error">
              <Text style={s.errorText}>{errorLabel}</Text>
            </View>
          )}

          {/* Input row */}
          <View style={s.inputRow}>
            <TextInput
              testID="chatbot-input"
              style={s.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message…"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              editable={!sending}
              multiline={false}
              accessibilityLabel="Chat input"
            />
            <TouchableOpacity
              testID="chatbot-send-btn"
              onPress={handleSend}
              disabled={!canSend}
              accessibilityLabel="Send message"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSend }}
              style={[s.sendBtn, !canSend && s.sendBtnDisabled]}
            >
              <Text style={[s.sendBtnText, !canSend && s.sendBtnTextDisabled]}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function styles(colors: any, spacing: any, borderRadius: any, insets: { bottom: number }) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
      maxHeight: '80%',
      paddingBottom: insets.bottom,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    closeBtn: {
      padding: spacing.xs,
    },
    closeBtnText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    messageList: {
      flex: 1,
    },
    messageListContent: {
      padding: spacing.md,
      gap: spacing.sm,
    },
    emptyHint: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      marginTop: spacing.md,
    },
    bubble: {
      maxWidth: '80%',
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    userBubble: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
    },
    assistantBubble: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceVariant ?? colors.card,
    },
    userText: {
      color: '#fff',
      fontSize: 14,
    },
    assistantText: {
      color: colors.text,
      fontSize: 14,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-start',
      marginTop: spacing.xs,
    },
    loadingText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    errorRow: {
      backgroundColor: colors.error ?? '#e53935',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    errorText: {
      color: '#fff',
      fontSize: 13,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      color: colors.text,
      fontSize: 14,
      minHeight: 36,
    },
    sendBtn: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      minHeight: 36,
      justifyContent: 'center',
    },
    sendBtnDisabled: {
      opacity: 0.4,
    },
    sendBtnText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
    sendBtnTextDisabled: {
      color: '#fff',
    },
  });
}
