/**
 * Tests for AppImage — unified image wrapper with caching, placeholder,
 * retry-on-error, and progressive load via expo-image.
 *
 * TDD: tests written before implementation (cm-48e).
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { AppImage } from '../AppImage';
import { ThemeProvider } from '@/theme';

// expo-image is auto-mocked via __mocks__/expo-image.js — passes all props through

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider initialColorMode="light">{children}</ThemeProvider>
);

describe('AppImage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders with a URI source', () => {
      const { getByTestId } = render(
        <AppImage source={{ uri: 'https://example.com/image.jpg' }} testID="app-image" />,
        { wrapper },
      );
      expect(getByTestId('app-image')).toBeTruthy();
    });

    it('passes URI to underlying expo Image', () => {
      const uri = 'https://example.com/product.jpg';
      const { getByTestId } = render(<AppImage source={{ uri }} testID="app-image" />, { wrapper });
      const img = getByTestId('app-image');
      expect(img.props.source).toEqual({ uri });
    });

    it('applies contentFit prop', () => {
      const { getByTestId } = render(
        <AppImage
          source={{ uri: 'https://example.com/img.jpg' }}
          contentFit="contain"
          testID="app-image"
        />,
        { wrapper },
      );
      expect(getByTestId('app-image').props.contentFit).toBe('contain');
    });

    it('defaults contentFit to cover', () => {
      const { getByTestId } = render(
        <AppImage source={{ uri: 'https://example.com/img.jpg' }} testID="app-image" />,
        { wrapper },
      );
      expect(getByTestId('app-image').props.contentFit).toBe('cover');
    });

    it('passes accessibilityLabel', () => {
      const { getByTestId } = render(
        <AppImage
          source={{ uri: 'https://example.com/img.jpg' }}
          accessibilityLabel="A futon in a room"
          testID="app-image"
        />,
        { wrapper },
      );
      expect(getByTestId('app-image').props.accessibilityLabel).toBe('A futon in a room');
    });
  });

  // ── Caching ───────────────────────────────────────────────────────────────

  describe('caching', () => {
    it('defaults cachePolicy to memory-disk', () => {
      const { getByTestId } = render(
        <AppImage source={{ uri: 'https://example.com/img.jpg' }} testID="app-image" />,
        { wrapper },
      );
      expect(getByTestId('app-image').props.cachePolicy).toBe('memory-disk');
    });

    it('accepts a custom cachePolicy', () => {
      const { getByTestId } = render(
        <AppImage
          source={{ uri: 'https://example.com/img.jpg' }}
          cachePolicy="disk"
          testID="app-image"
        />,
        { wrapper },
      );
      expect(getByTestId('app-image').props.cachePolicy).toBe('disk');
    });

    it('accepts cachePolicy none', () => {
      const { getByTestId } = render(
        <AppImage
          source={{ uri: 'https://example.com/img.jpg' }}
          cachePolicy="none"
          testID="app-image"
        />,
        { wrapper },
      );
      expect(getByTestId('app-image').props.cachePolicy).toBe('none');
    });
  });

  // ── Placeholder ───────────────────────────────────────────────────────────

  describe('placeholder', () => {
    it('passes blurhash string as placeholder to expo Image', () => {
      const blurhash = 'LKO2:N%2Tw=w]~RBVZRi};RPxuwH';
      const { getByTestId } = render(
        <AppImage
          source={{ uri: 'https://example.com/img.jpg' }}
          placeholder={blurhash}
          testID="app-image"
        />,
        { wrapper },
      );
      const img = getByTestId('app-image');
      expect(img.props.placeholder).toEqual({ blurhash });
    });

    it('shows skeleton container while loading (no blurhash)', () => {
      const { getByTestId } = render(
        <AppImage source={{ uri: 'https://example.com/img.jpg' }} testID="app-image" />,
        { wrapper },
      );
      expect(getByTestId('app-image-skeleton')).toBeTruthy();
    });

    it('hides skeleton after image loads', () => {
      const { getByTestId, queryByTestId } = render(
        <AppImage source={{ uri: 'https://example.com/img.jpg' }} testID="app-image" />,
        { wrapper },
      );
      act(() => {
        getByTestId('app-image').props.onLoad();
      });
      expect(queryByTestId('app-image-skeleton')).toBeNull();
    });

    it('does not show skeleton when blurhash is provided (expo-image handles it)', () => {
      const { queryByTestId } = render(
        <AppImage
          source={{ uri: 'https://example.com/img.jpg' }}
          placeholder="LKO2:N%2Tw=w]~RBVZRi};RPxuwH"
          testID="app-image"
        />,
        { wrapper },
      );
      expect(queryByTestId('app-image-skeleton')).toBeNull();
    });
  });

  // ── Progressive load ──────────────────────────────────────────────────────

  describe('progressive load', () => {
    it('applies transition prop for fade-in animation', () => {
      const { getByTestId } = render(
        <AppImage
          source={{ uri: 'https://example.com/img.jpg' }}
          transition={300}
          testID="app-image"
        />,
        { wrapper },
      );
      expect(getByTestId('app-image').props.transition).toBe(300);
    });

    it('defaults transition to 200ms', () => {
      const { getByTestId } = render(
        <AppImage source={{ uri: 'https://example.com/img.jpg' }} testID="app-image" />,
        { wrapper },
      );
      expect(getByTestId('app-image').props.transition).toBe(200);
    });

    it('calls onLoad callback when image finishes loading', () => {
      const onLoad = jest.fn();
      const { getByTestId } = render(
        <AppImage
          source={{ uri: 'https://example.com/img.jpg' }}
          onLoad={onLoad}
          testID="app-image"
        />,
        { wrapper },
      );
      act(() => {
        getByTestId('app-image').props.onLoad();
      });
      expect(onLoad).toHaveBeenCalledTimes(1);
    });
  });

  // ── Retry ─────────────────────────────────────────────────────────────────

  describe('retry on error', () => {
    it('retries after error (image still present after retry)', () => {
      const { getByTestId } = render(
        <AppImage
          source={{ uri: 'https://example.com/img.jpg' }}
          maxRetries={3}
          retryDelayMs={0}
          testID="app-image"
        />,
        { wrapper },
      );

      act(() => {
        getByTestId('app-image').props.onError({ error: 'network error' });
        jest.runAllTimers();
      });

      // Image should still be present (retrying, not in error state)
      expect(getByTestId('app-image')).toBeTruthy();
    });

    it('does not call onError until maxRetries exhausted', () => {
      const onError = jest.fn();
      const { getByTestId } = render(
        <AppImage
          source={{ uri: 'https://example.com/img.jpg' }}
          maxRetries={2}
          retryDelayMs={0}
          onError={onError}
          testID="app-image"
        />,
        { wrapper },
      );

      // First error — should not call onError yet
      act(() => {
        getByTestId('app-image').props.onError({ error: 'fail' });
        jest.runAllTimers();
      });
      expect(onError).not.toHaveBeenCalled();

      // Second error — still not called
      act(() => {
        getByTestId('app-image').props.onError({ error: 'fail' });
        jest.runAllTimers();
      });
      expect(onError).not.toHaveBeenCalled();

      // Third error — maxRetries (2) exhausted
      act(() => {
        getByTestId('app-image').props.onError({ error: 'fail' });
        jest.runAllTimers();
      });
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('calls onError immediately when maxRetries is 0', () => {
      const onError = jest.fn();
      const { getByTestId } = render(
        <AppImage
          source={{ uri: 'https://example.com/img.jpg' }}
          maxRetries={0}
          onError={onError}
          testID="app-image"
        />,
        { wrapper },
      );
      act(() => {
        getByTestId('app-image').props.onError({ error: 'fail' });
        jest.runAllTimers();
      });
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('defaults maxRetries to 3', () => {
      const onError = jest.fn();
      const { getByTestId } = render(
        <AppImage
          source={{ uri: 'https://example.com/img.jpg' }}
          retryDelayMs={0}
          onError={onError}
          testID="app-image"
        />,
        { wrapper },
      );

      // Fire 3 errors (retries 1-3) — onError not called yet
      for (let i = 0; i < 3; i++) {
        act(() => {
          getByTestId('app-image').props.onError({ error: 'fail' });
          jest.runAllTimers();
        });
      }
      expect(onError).not.toHaveBeenCalled();

      // 4th error — maxRetries (3) exhausted
      act(() => {
        getByTestId('app-image').props.onError({ error: 'fail' });
        jest.runAllTimers();
      });
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('resets retry count after successful load', () => {
      const onError = jest.fn();
      const { getByTestId } = render(
        <AppImage
          source={{ uri: 'https://example.com/img.jpg' }}
          maxRetries={1}
          retryDelayMs={0}
          onError={onError}
          testID="app-image"
        />,
        { wrapper },
      );

      // Error then success — retry count should reset
      act(() => {
        getByTestId('app-image').props.onError({ error: 'fail' });
        jest.runAllTimers();
      });
      act(() => {
        getByTestId('app-image').props.onLoad();
      });

      // Error again — should retry once more (not immediately call onError)
      act(() => {
        getByTestId('app-image').props.onError({ error: 'fail' });
        jest.runAllTimers();
      });
      expect(onError).not.toHaveBeenCalled();
    });

    it('uses retryDelayMs for delay between retries', () => {
      const onError = jest.fn();
      const { getByTestId } = render(
        <AppImage
          source={{ uri: 'https://example.com/img.jpg' }}
          maxRetries={1}
          retryDelayMs={500}
          onError={onError}
          testID="app-image"
        />,
        { wrapper },
      );

      // First error triggers retry after 500ms
      act(() => {
        getByTestId('app-image').props.onError({ error: 'fail' });
      });
      // Before delay, image should still be present
      expect(getByTestId('app-image')).toBeTruthy();

      // Second error triggers final failure
      act(() => {
        jest.advanceTimersByTime(500);
        getByTestId('app-image').props.onError({ error: 'fail' });
        jest.runAllTimers();
      });
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  // ── Error state ───────────────────────────────────────────────────────────

  describe('error state after exhausted retries', () => {
    it('shows error fallback after all retries fail', () => {
      const { getByTestId } = render(
        <AppImage
          source={{ uri: 'https://example.com/img.jpg' }}
          maxRetries={0}
          retryDelayMs={0}
          testID="app-image"
        />,
        { wrapper },
      );
      act(() => {
        getByTestId('app-image').props.onError({ error: 'fail' });
        jest.runAllTimers();
      });
      expect(getByTestId('app-image-error')).toBeTruthy();
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles undefined onLoad gracefully', () => {
      const { getByTestId } = render(
        <AppImage source={{ uri: 'https://example.com/img.jpg' }} testID="app-image" />,
        { wrapper },
      );
      expect(() => {
        act(() => {
          getByTestId('app-image').props.onLoad();
        });
      }).not.toThrow();
    });

    it('handles undefined onError gracefully (no prop passed)', () => {
      const { getByTestId } = render(
        <AppImage
          source={{ uri: 'https://example.com/img.jpg' }}
          maxRetries={0}
          retryDelayMs={0}
          testID="app-image"
        />,
        { wrapper },
      );
      expect(() => {
        act(() => {
          getByTestId('app-image').props.onError({ error: 'fail' });
          jest.runAllTimers();
        });
      }).not.toThrow();
    });

    it('renders with empty-string URI without crashing', () => {
      expect(() => {
        render(<AppImage source={{ uri: '' }} testID="app-image" />, { wrapper });
      }).not.toThrow();
    });
  });
});
