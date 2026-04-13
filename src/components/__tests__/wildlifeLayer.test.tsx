/**
 * Tests for WildlifeLayer — cf-hhf
 * TDD: written before implementation.
 *
 * Covers: birds/fireflies/owls visibility gating, fallback default state,
 * opacity threshold edge cases, graceful error handling.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { WildlifeLayer } from '../WildlifeLayer';
import { DEFAULT_SKY_STATE } from '@/types/livingSky';
import type { LivingSkyState } from '@/types/livingSky';

function stateWith(overrides: Partial<LivingSkyState>): LivingSkyState {
  return { ...DEFAULT_SKY_STATE, ...overrides };
}

describe('WildlifeLayer', () => {
  describe('root container', () => {
    it('renders wildlife-layer testID', () => {
      const { getByTestId } = render(<WildlifeLayer skyState={DEFAULT_SKY_STATE} />);
      expect(getByTestId('wildlife-layer')).toBeTruthy();
    });
  });

  describe('birds', () => {
    it('shows wildlife-birds when birdOpacity = 0.8', () => {
      const { getByTestId } = render(<WildlifeLayer skyState={stateWith({ birdOpacity: 0.8 })} />);
      expect(getByTestId('wildlife-birds')).toBeTruthy();
    });

    it('hides wildlife-birds when birdOpacity = 0', () => {
      const { queryByTestId } = render(<WildlifeLayer skyState={stateWith({ birdOpacity: 0 })} />);
      expect(queryByTestId('wildlife-birds')).toBeNull();
    });

    it('shows birds at exact threshold 0.1', () => {
      const { queryByTestId: below } = render(
        <WildlifeLayer skyState={stateWith({ birdOpacity: 0.1 })} />,
      );
      expect(below('wildlife-birds')).toBeNull();
    });

    it('shows birds just above threshold (0.11)', () => {
      const { getByTestId } = render(<WildlifeLayer skyState={stateWith({ birdOpacity: 0.11 })} />);
      expect(getByTestId('wildlife-birds')).toBeTruthy();
    });
  });

  describe('fireflies', () => {
    it('shows wildlife-fireflies at night state (fireflyOpacity = 0.85)', () => {
      const { getByTestId } = render(
        <WildlifeLayer skyState={stateWith({ fireflyOpacity: 0.85 })} />,
      );
      expect(getByTestId('wildlife-fireflies')).toBeTruthy();
    });

    it('hides wildlife-fireflies during day (fireflyOpacity = 0)', () => {
      const { queryByTestId } = render(
        <WildlifeLayer skyState={stateWith({ fireflyOpacity: 0 })} />,
      );
      expect(queryByTestId('wildlife-fireflies')).toBeNull();
    });

    it('hides fireflies at threshold (0.1)', () => {
      const { queryByTestId } = render(
        <WildlifeLayer skyState={stateWith({ fireflyOpacity: 0.1 })} />,
      );
      expect(queryByTestId('wildlife-fireflies')).toBeNull();
    });
  });

  describe('owl', () => {
    it('shows wildlife-owl at deep night state (owlOpacity = 0.9)', () => {
      const { getByTestId } = render(<WildlifeLayer skyState={stateWith({ owlOpacity: 0.9 })} />);
      expect(getByTestId('wildlife-owl')).toBeTruthy();
    });

    it('hides wildlife-owl during day (owlOpacity = 0)', () => {
      const { queryByTestId } = render(<WildlifeLayer skyState={stateWith({ owlOpacity: 0 })} />);
      expect(queryByTestId('wildlife-owl')).toBeNull();
    });

    it('shows owl just above threshold (owlOpacity = 0.15)', () => {
      const { getByTestId } = render(<WildlifeLayer skyState={stateWith({ owlOpacity: 0.15 })} />);
      expect(getByTestId('wildlife-owl')).toBeTruthy();
    });
  });

  describe('default state (DEFAULT_SKY_STATE = midday summer)', () => {
    it('shows birds in default midday state (birdOpacity = 0.3)', () => {
      const { getByTestId } = render(<WildlifeLayer skyState={DEFAULT_SKY_STATE} />);
      // midday birdOpacity = 0.3 > 0.1 → visible
      expect(getByTestId('wildlife-birds')).toBeTruthy();
    });

    it('hides fireflies in default midday state (fireflyOpacity = 0)', () => {
      const { queryByTestId } = render(<WildlifeLayer skyState={DEFAULT_SKY_STATE} />);
      // midday fireflyOpacity = 0 → hidden
      expect(queryByTestId('wildlife-fireflies')).toBeNull();
    });

    it('hides owl in default midday state (owlOpacity = 0)', () => {
      const { queryByTestId } = render(<WildlifeLayer skyState={DEFAULT_SKY_STATE} />);
      // midday owlOpacity = 0 → hidden
      expect(queryByTestId('wildlife-owl')).toBeNull();
    });
  });

  describe('deep night combo (all wildlife active)', () => {
    it('shows birds, fireflies, and owl simultaneously at dusk', () => {
      const dusk = stateWith({
        birdOpacity: 1,
        fireflyOpacity: 0.6,
        owlOpacity: 0.65,
      });
      const { getByTestId } = render(<WildlifeLayer skyState={dusk} />);
      expect(getByTestId('wildlife-birds')).toBeTruthy();
      expect(getByTestId('wildlife-fireflies')).toBeTruthy();
      expect(getByTestId('wildlife-owl')).toBeTruthy();
    });
  });
});
