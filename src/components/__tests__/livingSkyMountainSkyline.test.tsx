/**
 * Tests for LivingSkyMountainSkyline — Phase 7 living sky renderer.
 * TDD: tests written before implementation per Melania Directive.
 *
 * Component accepts LivingSkyState and renders a react-native-svg skyline
 * (viewBox 0 0 1040 150) with sky gradient, 4 ridge layers, sun/moon,
 * stars, clouds, birds, fireflies, and precipitation.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { LivingSkyMountainSkyline } from '../LivingSkyMountainSkyline';
import { DEFAULT_SKY_STATE, type LivingSkyState } from '@/types/livingSky';

/** Build a full state by merging overrides onto the default */
function stateWith(overrides: Partial<LivingSkyState>): LivingSkyState {
  return { ...DEFAULT_SKY_STATE, ...overrides };
}

describe('LivingSkyMountainSkyline', () => {
  describe('root element', () => {
    it('renders with testID living-sky-skyline', () => {
      const { getByTestId } = render(<LivingSkyMountainSkyline state={DEFAULT_SKY_STATE} />);
      expect(getByTestId('living-sky-skyline')).toBeTruthy();
    });

    it('renders without crashing when using DEFAULT_SKY_STATE', () => {
      expect(() => render(<LivingSkyMountainSkyline state={DEFAULT_SKY_STATE} />)).not.toThrow();
    });

    it('forwards custom testID', () => {
      const { getByTestId } = render(
        <LivingSkyMountainSkyline state={DEFAULT_SKY_STATE} testID="my-sky" />,
      );
      expect(getByTestId('my-sky')).toBeTruthy();
    });
  });

  describe('sky gradient', () => {
    it('renders sky-rect background element', () => {
      const { getByTestId } = render(<LivingSkyMountainSkyline state={DEFAULT_SKY_STATE} />);
      expect(getByTestId('sky-rect')).toBeTruthy();
    });
  });

  describe('ridge layers', () => {
    it('renders all 4 ridge layer paths', () => {
      const { getByTestId } = render(<LivingSkyMountainSkyline state={DEFAULT_SKY_STATE} />);
      expect(getByTestId('ridge-r4')).toBeTruthy();
      expect(getByTestId('ridge-r3')).toBeTruthy();
      expect(getByTestId('ridge-r2')).toBeTruthy();
      expect(getByTestId('ridge-r1')).toBeTruthy();
    });
  });

  describe('sun', () => {
    it('renders sun element when sunPos.opacity > 0', () => {
      const state = stateWith({ sunPos: { cx: 520, cy: 20, r: 14, opacity: 1 } });
      const { getByTestId } = render(<LivingSkyMountainSkyline state={state} />);
      expect(getByTestId('sky-sun')).toBeTruthy();
    });

    it('does not render sun when sunPos.opacity is 0', () => {
      const state = stateWith({ sunPos: { cx: 520, cy: 20, r: 14, opacity: 0 } });
      const { queryByTestId } = render(<LivingSkyMountainSkyline state={state} />);
      expect(queryByTestId('sky-sun')).toBeNull();
    });
  });

  describe('moon', () => {
    it('renders moon element when moonPos.opacity > 0', () => {
      const state = stateWith({
        moonPos: { cx: 200, cy: 30, opacity: 0.9, phase: 0.5, shadowOffset: { dx: 0, dy: 0 } },
      });
      const { getByTestId } = render(<LivingSkyMountainSkyline state={state} />);
      expect(getByTestId('sky-moon')).toBeTruthy();
    });

    it('does not render moon when moonPos.opacity is 0', () => {
      const state = stateWith({
        moonPos: { cx: 200, cy: 30, opacity: 0, phase: 0.5, shadowOffset: { dx: 0, dy: 0 } },
      });
      const { queryByTestId } = render(<LivingSkyMountainSkyline state={state} />);
      expect(queryByTestId('sky-moon')).toBeNull();
    });
  });

  describe('stars', () => {
    it('renders star layer when starOpacity > 0', () => {
      const state = stateWith({ starOpacity: 0.8 });
      const { getByTestId } = render(<LivingSkyMountainSkyline state={state} />);
      expect(getByTestId('sky-stars')).toBeTruthy();
    });

    it('does not render star layer when starOpacity is 0', () => {
      const state = stateWith({ starOpacity: 0 });
      const { queryByTestId } = render(<LivingSkyMountainSkyline state={state} />);
      expect(queryByTestId('sky-stars')).toBeNull();
    });
  });

  describe('birds', () => {
    it('renders bird layer when birdOpacity > 0', () => {
      const state = stateWith({ birdOpacity: 0.4 });
      const { getByTestId } = render(<LivingSkyMountainSkyline state={state} />);
      expect(getByTestId('sky-birds')).toBeTruthy();
    });

    it('does not render bird layer when birdOpacity is 0', () => {
      const state = stateWith({ birdOpacity: 0 });
      const { queryByTestId } = render(<LivingSkyMountainSkyline state={state} />);
      expect(queryByTestId('sky-birds')).toBeNull();
    });
  });

  describe('fireflies', () => {
    it('renders firefly layer when fireflyOpacity > 0', () => {
      const state = stateWith({ fireflyOpacity: 0.6 });
      const { getByTestId } = render(<LivingSkyMountainSkyline state={state} />);
      expect(getByTestId('sky-fireflies')).toBeTruthy();
    });

    it('does not render firefly layer when fireflyOpacity is 0', () => {
      const state = stateWith({ fireflyOpacity: 0 });
      const { queryByTestId } = render(<LivingSkyMountainSkyline state={state} />);
      expect(queryByTestId('sky-fireflies')).toBeNull();
    });
  });

  describe('precipitation', () => {
    it('renders precipitation layer when precipitationOpacity > 0 and type is snow', () => {
      const state = stateWith({ precipitationOpacity: 0.5, precipitationType: 'snow' });
      const { getByTestId } = render(<LivingSkyMountainSkyline state={state} />);
      expect(getByTestId('sky-precipitation')).toBeTruthy();
    });

    it('renders precipitation layer when precipitationOpacity > 0 and type is mist', () => {
      const state = stateWith({ precipitationOpacity: 0.3, precipitationType: 'mist' });
      const { getByTestId } = render(<LivingSkyMountainSkyline state={state} />);
      expect(getByTestId('sky-precipitation')).toBeTruthy();
    });

    it('does not render precipitation when precipitationType is none', () => {
      const state = stateWith({ precipitationOpacity: 0.5, precipitationType: 'none' });
      const { queryByTestId } = render(<LivingSkyMountainSkyline state={state} />);
      expect(queryByTestId('sky-precipitation')).toBeNull();
    });

    it('does not render precipitation when precipitationOpacity is 0', () => {
      const state = stateWith({ precipitationOpacity: 0, precipitationType: 'snow' });
      const { queryByTestId } = render(<LivingSkyMountainSkyline state={state} />);
      expect(queryByTestId('sky-precipitation')).toBeNull();
    });
  });

  describe('rim light', () => {
    it('renders rim light overlay when rimOpacity > 0', () => {
      const state = stateWith({ rimOpacity: 0.5, rimColor: '#FFD080' });
      const { getByTestId } = render(<LivingSkyMountainSkyline state={state} />);
      expect(getByTestId('sky-rim-light')).toBeTruthy();
    });

    it('does not render rim light when rimOpacity is 0', () => {
      const state = stateWith({ rimOpacity: 0 });
      const { queryByTestId } = render(<LivingSkyMountainSkyline state={state} />);
      expect(queryByTestId('sky-rim-light')).toBeNull();
    });
  });

  describe('deep night state (all sky elements)', () => {
    it('renders stars, moon and no sun at deep night', () => {
      const nightState = stateWith({
        skyColors: ['#0A0A1A', '#0D0D2B', '#0F0F33', '#101040'],
        sunPos: { cx: -100, cy: 30, r: 14, opacity: 0 },
        moonPos: { cx: 300, cy: 25, opacity: 0.95, phase: 0.25, shadowOffset: { dx: 8, dy: 0 } },
        starOpacity: 0.9,
        birdOpacity: 0,
        fireflyOpacity: 0.7,
      });
      const { getByTestId, queryByTestId } = render(
        <LivingSkyMountainSkyline state={nightState} />,
      );
      expect(queryByTestId('sky-sun')).toBeNull();
      expect(getByTestId('sky-moon')).toBeTruthy();
      expect(getByTestId('sky-stars')).toBeTruthy();
      expect(getByTestId('sky-fireflies')).toBeTruthy();
      expect(queryByTestId('sky-birds')).toBeNull();
    });
  });
});
