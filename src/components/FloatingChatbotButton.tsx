/**
 * @module FloatingChatbotButton
 *
 * Phase 3 ChatbotUI — floating action button that opens the chat modal.
 * Renders in the bottom-right corner above the tab bar.
 *
 * cfutons_mobile-6hb
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

const TAB_BAR_HEIGHT = 49;
const BUTTON_SIZE = 52;

interface Props {
  onPress: () => void;
  hidden?: boolean;
}

export function FloatingChatbotButton({ onPress, hidden = false }: Props) {
  const { colors, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();

  if (hidden) return null;

  const bottom = TAB_BAR_HEIGHT + insets.bottom + 16;

  return (
    <TouchableOpacity
      testID="floating-chatbot-btn"
      onPress={onPress}
      accessibilityLabel="Open chat assistant"
      accessibilityRole="button"
      style={[styles.btn, { bottom, backgroundColor: colors.primary, borderRadius: BUTTON_SIZE / 2 }]}
    >
      <Text style={styles.icon}>💬</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    right: 16,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  icon: {
    fontSize: 24,
  },
});
