/**
 * @module KeyboardAwareScrollView
 *
 * Drop-in replacement for ScrollView that handles keyboard avoidance.
 * Wraps content in KeyboardAvoidingView (behavior differs per platform)
 * and auto-scrolls to focused TextInput fields on long forms.
 */
import React, { useRef, useCallback } from 'react';
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  type ScrollViewProps,
  type TextInput,
  type NativeSyntheticEvent,
  type LayoutChangeEvent,
  findNodeHandle,
  UIManager,
} from 'react-native';

interface Props extends ScrollViewProps {
  children: React.ReactNode;
  /** Extra offset (px) above the focused field. Default: 80 */
  extraScrollOffset?: number;
}

export function KeyboardAwareScrollView({
  children,
  extraScrollOffset = 80,
  contentContainerStyle,
  ...rest
}: Props) {
  const scrollRef = useRef<ScrollView>(null);

  const handleFocus = useCallback(
    (e: NativeSyntheticEvent<{ target: number }>) => {
      const target = e.nativeEvent.target;
      if (!scrollRef.current || !target) return;

      // Small delay to let keyboard animation start
      setTimeout(() => {
        const scrollNode = findNodeHandle(scrollRef.current);
        if (!scrollNode) return;

        UIManager.measureLayout(
          target,
          scrollNode,
          () => {},
          (_x: number, y: number) => {
            scrollRef.current?.scrollTo({
              y: Math.max(0, y - extraScrollOffset),
              animated: true,
            });
          },
        );
      }, 150);
    },
    [extraScrollOffset],
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...rest}
        {...({ onFocus: handleFocus } as any)}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
