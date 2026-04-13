/**
 * @module BadgeToastContext.test
 * TDD tests for the BadgeToastContext — hq-v0a2z.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { BadgeToastProvider, useBadgeToastContext } from '../BadgeToastContext';
import { ThemeProvider } from '@/theme/ThemeProvider';

jest.useFakeTimers();
afterAll(() => jest.useRealTimers());

/** Helper: a button that fires showBadgeToast on press. */
function TriggerButton({ name }: { name: string }) {
  const { showBadgeToast } = useBadgeToastContext();
  return (
    <TouchableOpacity onPress={() => showBadgeToast(name)} testID="trigger-btn">
      <Text>Fire toast</Text>
    </TouchableOpacity>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <BadgeToastProvider>{children}</BadgeToastProvider>
    </ThemeProvider>
  );
}

describe('BadgeToastContext', () => {
  it('provides showBadgeToast without crashing', () => {
    const { getByTestId } = render(
      <Wrapper>
        <TriggerButton name="Explorer Badge" />
      </Wrapper>,
    );
    expect(() => fireEvent.press(getByTestId('trigger-btn'))).not.toThrow();
  });

  it('renders BadgeToastHost (the global toast) inside the provider', () => {
    const { getByTestId } = render(
      <Wrapper>
        <View />
      </Wrapper>,
    );
    // BadgeToast is in the tree but hidden initially (accessibilityElementsHidden=true)
    expect(getByTestId('badge-toast', { includeHiddenElements: true })).toBeTruthy();
  });

  it('shows badge-toast after showBadgeToast is called', () => {
    const { getByTestId } = render(
      <Wrapper>
        <TriggerButton name="Night Owl" />
      </Wrapper>,
    );
    fireEvent.press(getByTestId('trigger-btn'));
    // BadgeToast is now visible (accessibilityElementsHidden = false)
    expect(getByTestId('badge-toast').props.accessibilityElementsHidden).toBe(false);
  });

  it('toast shows the triggered badge name', () => {
    const { getByTestId, getByText } = render(
      <Wrapper>
        <TriggerButton name="Trail Blazer" />
      </Wrapper>,
    );
    fireEvent.press(getByTestId('trigger-btn'));
    expect(getByText(/Trail Blazer/i)).toBeTruthy();
  });

  it('useBadgeToastContext throws outside provider', () => {
    const Bad = () => {
      useBadgeToastContext();
      return null;
    };
    expect(() => render(<Bad />)).toThrow(/BadgeToastProvider/);
  });
});
