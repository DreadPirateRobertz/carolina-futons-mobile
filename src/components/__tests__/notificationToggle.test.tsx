/**
 * @module NotificationToggle tests
 * TDD spec — written before implementation.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NotificationToggle } from '../NotificationToggle';
import { ThemeProvider } from '@/theme/ThemeProvider';

function renderToggle(props: Partial<React.ComponentProps<typeof NotificationToggle>> = {}) {
  return render(
    <ThemeProvider>
      <NotificationToggle
        label="Streak Milestones"
        description="Get notified when you hit a streak milestone"
        value={true}
        onToggle={jest.fn()}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('NotificationToggle', () => {
  describe('rendering', () => {
    it('renders label text', () => {
      const { getByText } = renderToggle({ label: 'Streak Milestones' });
      expect(getByText('Streak Milestones')).toBeTruthy();
    });

    it('renders description text', () => {
      const { getByText } = renderToggle({
        description: 'Get notified when you hit a streak milestone',
      });
      expect(getByText('Get notified when you hit a streak milestone')).toBeTruthy();
    });

    it('uses testID for the row container', () => {
      const { getByTestId } = renderToggle({ testID: 'pref-row-streak_milestone' });
      expect(getByTestId('pref-row-streak_milestone')).toBeTruthy();
    });

    it('uses toggleTestID for the Switch', () => {
      const { getByTestId } = renderToggle({ toggleTestID: 'pref-toggle-streak_milestone' });
      expect(getByTestId('pref-toggle-streak_milestone')).toBeTruthy();
    });
  });

  describe('switch value', () => {
    it('renders switch as on when value=true', () => {
      const { getByTestId } = renderToggle({
        value: true,
        toggleTestID: 'toggle-on',
      });
      expect(getByTestId('toggle-on').props.value).toBe(true);
    });

    it('renders switch as off when value=false', () => {
      const { getByTestId } = renderToggle({
        value: false,
        toggleTestID: 'toggle-off',
      });
      expect(getByTestId('toggle-off').props.value).toBe(false);
    });
  });

  describe('interactions', () => {
    it('calls onToggle with new value when switch toggled on', () => {
      const onToggle = jest.fn();
      const { getByTestId } = renderToggle({
        value: false,
        onToggle,
        toggleTestID: 'my-toggle',
      });
      fireEvent(getByTestId('my-toggle'), 'valueChange', true);
      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('calls onToggle with false when switch toggled off', () => {
      const onToggle = jest.fn();
      const { getByTestId } = renderToggle({
        value: true,
        onToggle,
        toggleTestID: 'my-toggle',
      });
      fireEvent(getByTestId('my-toggle'), 'valueChange', false);
      expect(onToggle).toHaveBeenCalledWith(false);
    });

    it('calls onToggle exactly once per interaction', () => {
      const onToggle = jest.fn();
      const { getByTestId } = renderToggle({ onToggle, toggleTestID: 'my-toggle' });
      fireEvent(getByTestId('my-toggle'), 'valueChange', false);
      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('disabled state', () => {
    it('switch is disabled when disabled=true', () => {
      const { getByTestId } = renderToggle({
        disabled: true,
        toggleTestID: 'disabled-toggle',
      });
      expect(getByTestId('disabled-toggle').props.disabled).toBe(true);
    });

    it('switch is not disabled by default', () => {
      const { getByTestId } = renderToggle({ toggleTestID: 'enabled-toggle' });
      expect(getByTestId('enabled-toggle').props.disabled).toBeFalsy();
    });

    it('does not call onToggle when disabled', () => {
      const onToggle = jest.fn();
      const { getByTestId } = renderToggle({
        disabled: true,
        onToggle,
        toggleTestID: 'disabled-toggle',
      });
      fireEvent(getByTestId('disabled-toggle'), 'valueChange', false);
      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('switch has accessibilityRole switch', () => {
      const { getByTestId } = renderToggle({ toggleTestID: 'a11y-toggle' });
      expect(getByTestId('a11y-toggle').props.accessibilityRole).toBe('switch');
    });

    it('switch accessibilityLabel contains the label text', () => {
      const { getByTestId } = renderToggle({
        label: 'Quest Complete',
        toggleTestID: 'a11y-toggle',
      });
      expect(getByTestId('a11y-toggle').props.accessibilityLabel).toContain('Quest Complete');
    });
  });
});
