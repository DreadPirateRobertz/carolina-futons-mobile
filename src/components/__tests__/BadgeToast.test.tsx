/**
 * @module BadgeToast.test
 * TDD tests for the BadgeToast component — hq-v0a2z.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { BadgeToast } from '../BadgeToast';

const mockInsets = { top: 0, right: 0, bottom: 0, left: 0 };
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));

function renderToast(props: { badgeName: string; visible: boolean; testID?: string }) {
  return render(
    <ThemeProvider>
      <BadgeToast {...props} />
    </ThemeProvider>,
  );
}

describe('BadgeToast', () => {
  describe('when visible', () => {
    it('renders without crashing', () => {
      expect(() => renderToast({ badgeName: 'Explorer Badge', visible: true })).not.toThrow();
    });

    it('has default testID badge-toast', () => {
      const { getByTestId } = renderToast({ badgeName: 'Explorer Badge', visible: true });
      expect(getByTestId('badge-toast')).toBeTruthy();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = renderToast({
        badgeName: 'Explorer Badge',
        visible: true,
        testID: 'custom-badge-toast',
      });
      expect(getByTestId('custom-badge-toast')).toBeTruthy();
    });

    it('shows "Badge Unlocked" label', () => {
      const { getByText } = renderToast({ badgeName: 'Explorer Badge', visible: true });
      expect(getByText(/Badge Unlocked/i)).toBeTruthy();
    });

    it('shows the badge name', () => {
      const { getByText } = renderToast({ badgeName: 'Night Owl', visible: true });
      expect(getByText(/Night Owl/i)).toBeTruthy();
    });

    it('has accessible label containing badge name', () => {
      const { getByTestId } = renderToast({ badgeName: 'Trail Blazer', visible: true });
      const el = getByTestId('badge-toast');
      expect(el.props.accessibilityLabel).toContain('Trail Blazer');
    });

    it('has accessibilityElementsHidden false when visible', () => {
      const { getByTestId } = renderToast({ badgeName: 'Explorer Badge', visible: true });
      expect(getByTestId('badge-toast').props.accessibilityElementsHidden).toBe(false);
    });

    it('is non-interactive (pointerEvents none)', () => {
      const { getByTestId } = renderToast({ badgeName: 'Explorer Badge', visible: true });
      expect(getByTestId('badge-toast').props.pointerEvents).toBe('none');
    });
  });

  describe('when not visible', () => {
    it('renders without crashing when not visible', () => {
      expect(() => renderToast({ badgeName: 'Explorer Badge', visible: false })).not.toThrow();
    });

    it('has accessibilityElementsHidden true when not visible', () => {
      const { getByTestId } = renderToast({ badgeName: 'Explorer Badge', visible: false });
      expect(
        getByTestId('badge-toast', { includeHiddenElements: true }).props
          .accessibilityElementsHidden,
      ).toBe(true);
    });
  });

  describe('safe area insets (hq-gbo6f)', () => {
    beforeEach(() => {
      mockInsets.bottom = 0;
    });

    it('adds safe area inset to bottom position (non-zero inset)', () => {
      mockInsets.bottom = 34;
      const { getByTestId } = renderToast({ badgeName: 'Explorer Badge', visible: true });
      const flatStyle = StyleSheet.flatten(getByTestId('badge-toast').props.style);
      expect(flatStyle.bottom).toBe(154);
    });

    it('uses base bottom (120) when safe area inset is zero', () => {
      mockInsets.bottom = 0;
      const { getByTestId } = renderToast({ badgeName: 'Explorer Badge', visible: true });
      const flatStyle = StyleSheet.flatten(getByTestId('badge-toast').props.style);
      expect(flatStyle.bottom).toBe(120);
    });
  });

  describe('badge name variations', () => {
    it('renders long badge names without crashing', () => {
      expect(() =>
        renderToast({ badgeName: 'Mountain Trail Blazer Explorer', visible: true }),
      ).not.toThrow();
    });

    it('renders emoji badge names', () => {
      const { getByText } = renderToast({ badgeName: '🏔️ Summit Seeker', visible: true });
      expect(getByText(/Summit Seeker/i)).toBeTruthy();
    });
  });
});
