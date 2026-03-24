/**
 * @module BadgeToast.test
 * TDD tests for the BadgeToast component — hq-v0a2z.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { BadgeToast } from '../BadgeToast';

const mockInsets = { bottom: 0, top: 0, left: 0, right: 0 };
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

  // ── Safe area bottom positioning (hq-gbo6f) ───────────────────────

  afterEach(() => {
    mockInsets.bottom = 0;
  });

  it('positions above tab bar + home indicator (inset=34)', () => {
    mockInsets.bottom = 34;
    const { getByTestId } = renderToast({ badgeName: 'Explorer Badge', visible: true });
    const toast = getByTestId('badge-toast');
    const flatStyle = StyleSheet.flatten(toast.props.style);
    // TAB_BAR_HEIGHT(49) + bottom(34) + padding(8) = 91
    expect(flatStyle.bottom).toBe(91);
  });

  it('positions above tab bar on non-indicator devices (inset=0)', () => {
    mockInsets.bottom = 0;
    const { getByTestId } = renderToast({ badgeName: 'Explorer Badge', visible: true });
    const toast = getByTestId('badge-toast');
    const flatStyle = StyleSheet.flatten(toast.props.style);
    // TAB_BAR_HEIGHT(49) + bottom(0) + padding(8) = 57
    expect(flatStyle.bottom).toBe(57);
  });

  describe('badgeKey SVG icon (hq-zarsg)', () => {
    it('shows SVG icon when badgeKey is provided', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <BadgeToast badgeName="Week Wanderer" visible={true} badgeKey="week_wanderer" />
        </ThemeProvider>,
      );
      expect(getByTestId('badge-toast-icon')).toBeTruthy();
    });

    it('does not show SVG icon when badgeKey is omitted', () => {
      const { queryByTestId } = renderToast({ badgeName: 'Explorer Badge', visible: true });
      expect(queryByTestId('badge-toast-icon')).toBeNull();
    });

    it('renders with streak_chip key without crashing', () => {
      expect(() =>
        render(
          <ThemeProvider>
            <BadgeToast badgeName="Streak" visible={true} badgeKey="streak_chip" />
          </ThemeProvider>,
        ),
      ).not.toThrow();
    });
  });
});
