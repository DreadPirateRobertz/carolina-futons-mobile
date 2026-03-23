/**
 * @module useBadgeToast.test
 * TDD tests for the useBadgeToast hook — hq-v0a2z.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useBadgeToast } from '../useBadgeToast';

jest.useFakeTimers();

describe('useBadgeToast', () => {
  describe('initial state', () => {
    it('visible is false initially', () => {
      const { result } = renderHook(() => useBadgeToast());
      expect(result.current.visible).toBe(false);
    });

    it('badgeName is null initially', () => {
      const { result } = renderHook(() => useBadgeToast());
      expect(result.current.badgeName).toBeNull();
    });

    it('exposes showBadgeToast function', () => {
      const { result } = renderHook(() => useBadgeToast());
      expect(typeof result.current.showBadgeToast).toBe('function');
    });
  });

  describe('showBadgeToast', () => {
    it('sets visible to true', () => {
      const { result } = renderHook(() => useBadgeToast());
      act(() => {
        result.current.showBadgeToast('Explorer Badge');
      });
      expect(result.current.visible).toBe(true);
    });

    it('sets badgeName to the provided name', () => {
      const { result } = renderHook(() => useBadgeToast());
      act(() => {
        result.current.showBadgeToast('Night Owl');
      });
      expect(result.current.badgeName).toBe('Night Owl');
    });

    it('auto-hides after the display duration', () => {
      const { result } = renderHook(() => useBadgeToast());
      act(() => {
        result.current.showBadgeToast('Explorer Badge');
      });
      expect(result.current.visible).toBe(true);

      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(result.current.visible).toBe(false);
    });

    it('badgeName persists after hide (for exit animation)', () => {
      const { result } = renderHook(() => useBadgeToast());
      act(() => {
        result.current.showBadgeToast('Trail Blazer');
      });
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      // Name persists so exit animation can still show the name
      expect(result.current.badgeName).toBe('Trail Blazer');
    });

    it('calling showBadgeToast again resets the timer', () => {
      const { result } = renderHook(() => useBadgeToast());
      act(() => {
        result.current.showBadgeToast('Badge One');
      });
      act(() => {
        jest.advanceTimersByTime(1500);
      });
      // Show a second badge before the first expires
      act(() => {
        result.current.showBadgeToast('Badge Two');
      });
      expect(result.current.badgeName).toBe('Badge Two');
      expect(result.current.visible).toBe(true);

      // Original timer would have fired at 3000ms from start, but was reset
      act(() => {
        jest.advanceTimersByTime(1600);
      });
      // Should still be visible (timer reset from Badge Two call)
      expect(result.current.visible).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1500);
      });
      expect(result.current.visible).toBe(false);
    });

    it('empty string does not show toast', () => {
      const { result } = renderHook(() => useBadgeToast());
      act(() => {
        result.current.showBadgeToast('');
      });
      expect(result.current.visible).toBe(false);
    });

    it('whitespace-only string does not show toast', () => {
      const { result } = renderHook(() => useBadgeToast());
      act(() => {
        result.current.showBadgeToast('   ');
      });
      expect(result.current.visible).toBe(false);
    });
  });
});
