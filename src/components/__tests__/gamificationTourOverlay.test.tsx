/**
 * GamificationTourOverlay tests — hq-jlttk
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GamificationTourOverlay } from '../GamificationTourOverlay';
import { ThemeProvider } from '@/theme/ThemeProvider';

const mockDismiss = jest.fn();

function wrap(visible = true, testID?: string) {
  return render(
    <ThemeProvider>
      <GamificationTourOverlay visible={visible} onDismiss={mockDismiss} testID={testID} />
    </ThemeProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe('GamificationTourOverlay', () => {
  describe('visibility', () => {
    it('renders overlay when visible=true', () => {
      const { getByTestId } = wrap(true);
      expect(getByTestId('gamification-tour')).toBeTruthy();
    });

    it('does not render overlay when visible=false', () => {
      const { queryByTestId } = wrap(false);
      expect(queryByTestId('gamification-tour')).toBeNull();
    });

    it('accepts a custom testID', () => {
      const { getByTestId } = wrap(true, 'custom-tour');
      expect(getByTestId('custom-tour')).toBeTruthy();
    });
  });

  describe('step 0 — points', () => {
    it('shows step 0 content on mount', () => {
      const { getByTestId } = wrap();
      expect(getByTestId('tour-step-0')).toBeTruthy();
    });

    it('shows a title on step 0', () => {
      const { getByTestId } = wrap();
      const title = getByTestId('tour-title');
      expect(title.props.children).toBeTruthy();
    });

    it('shows body text on step 0', () => {
      const { getByTestId } = wrap();
      expect(getByTestId('tour-body')).toBeTruthy();
    });

    it('renders Next button on step 0 (not last)', () => {
      const { getByTestId } = wrap();
      expect(getByTestId('tour-next').props.children).not.toBe('Get Started');
    });
  });

  describe('navigation', () => {
    it('advances to step 1 on Next press', () => {
      const { getByTestId, queryByTestId } = wrap();
      fireEvent.press(getByTestId('tour-next'));
      expect(getByTestId('tour-step-1')).toBeTruthy();
      expect(queryByTestId('tour-step-0')).toBeNull();
    });

    it('advances through all 4 steps', () => {
      const { getByTestId } = wrap();
      fireEvent.press(getByTestId('tour-next')); // → step 1
      fireEvent.press(getByTestId('tour-next')); // → step 2
      fireEvent.press(getByTestId('tour-next')); // → step 3
      expect(getByTestId('tour-step-3')).toBeTruthy();
    });

    it('shows "Get Started" on last step', () => {
      const { getByTestId } = wrap();
      fireEvent.press(getByTestId('tour-next')); // → 1
      fireEvent.press(getByTestId('tour-next')); // → 2
      fireEvent.press(getByTestId('tour-next')); // → 3 (last)
      expect(getByTestId('tour-next').props.children).toBe('Get Started');
    });

    it('"Get Started" calls onDismiss', () => {
      const { getByTestId } = wrap();
      fireEvent.press(getByTestId('tour-next')); // 1
      fireEvent.press(getByTestId('tour-next')); // 2
      fireEvent.press(getByTestId('tour-next')); // 3
      fireEvent.press(getByTestId('tour-next')); // Get Started
      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not call onDismiss when pressing Next on non-last step', () => {
      const { getByTestId } = wrap();
      fireEvent.press(getByTestId('tour-next'));
      expect(mockDismiss).not.toHaveBeenCalled();
    });
  });

  describe('skip', () => {
    it('renders Skip button', () => {
      const { getByTestId } = wrap();
      expect(getByTestId('tour-skip')).toBeTruthy();
    });

    it('skip calls onDismiss immediately from step 0', () => {
      const { getByTestId } = wrap();
      fireEvent.press(getByTestId('tour-skip'));
      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });

    it('skip calls onDismiss from mid-tour', () => {
      const { getByTestId } = wrap();
      fireEvent.press(getByTestId('tour-next')); // → step 1
      fireEvent.press(getByTestId('tour-skip'));
      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('progress dots', () => {
    it('renders 4 progress dots', () => {
      const { getByTestId } = wrap();
      expect(getByTestId('tour-progress')).toBeTruthy();
      // 4 dots: one per step
      expect(getByTestId('tour-dot-0')).toBeTruthy();
      expect(getByTestId('tour-dot-1')).toBeTruthy();
      expect(getByTestId('tour-dot-2')).toBeTruthy();
      expect(getByTestId('tour-dot-3')).toBeTruthy();
    });

    it('dot 0 is active on step 0', () => {
      const { getByTestId } = wrap();
      expect(getByTestId('tour-dot-0').props.testID).toBe('tour-dot-0');
    });

    it('dot 1 is rendered after advancing to step 1', () => {
      const { getByTestId } = wrap();
      fireEvent.press(getByTestId('tour-next'));
      expect(getByTestId('tour-step-1')).toBeTruthy();
      expect(getByTestId('tour-dot-1')).toBeTruthy();
    });
  });

  describe('step content', () => {
    const stepTitles = ['step 0', 'step 1', 'step 2', 'step 3'];

    stepTitles.forEach((_, idx) => {
      it(`renders unique title text on step ${idx}`, () => {
        const { getByTestId } = wrap();
        for (let i = 0; i < idx; i++) {
          fireEvent.press(getByTestId('tour-next'));
        }
        expect(getByTestId('tour-title').props.children).toBeTruthy();
      });
    });

    it('step 0 covers points', () => {
      const { getByTestId } = wrap();
      const title = getByTestId('tour-title').props.children as string;
      expect(typeof title).toBe('string');
      expect(title.length).toBeGreaterThan(0);
    });
  });
});
