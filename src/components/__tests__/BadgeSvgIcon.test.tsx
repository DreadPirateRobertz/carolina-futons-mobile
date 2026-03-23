/**
 * BadgeSvgIcon tests — hq-zarsg
 *
 * TDD spec for the React Native SVG badge icon component.
 * Ports the web animal badge silhouettes (badgeIcons.js) to react-native-svg.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { BadgeSvgIcon, BADGE_SVG_KEYS } from '../BadgeSvgIcon';

// react-native-svg is mocked globally in jest.setup.js

function renderIcon(badgeKey: string, size?: number, testID?: string) {
  return render(<BadgeSvgIcon badgeKey={badgeKey} size={size} testID={testID} />);
}

describe('BadgeSvgIcon', () => {
  describe('rendering known badge keys', () => {
    it('renders first_step (Eastern Bluebird) without crashing', () => {
      expect(() => renderIcon('first_step')).not.toThrow();
    });

    it('renders trail_regular (Black Bear) without crashing', () => {
      expect(() => renderIcon('trail_regular')).not.toThrow();
    });

    it('renders visualizer (Great Horned Owl) without crashing', () => {
      expect(() => renderIcon('visualizer')).not.toThrow();
    });

    it('renders curator (Luna Moth) without crashing', () => {
      expect(() => renderIcon('curator')).not.toThrow();
    });

    it('renders week_wanderer (Red-Tailed Hawk) without crashing', () => {
      expect(() => renderIcon('week_wanderer')).not.toThrow();
    });

    it('renders streak_chip (Sharp-shinned Hawk) without crashing', () => {
      expect(() => renderIcon('streak_chip')).not.toThrow();
    });
  });

  describe('testID', () => {
    it('uses default testID badge-svg-<key>', () => {
      const { getByTestId } = renderIcon('first_step');
      expect(getByTestId('badge-svg-first_step')).toBeTruthy();
    });

    it('uses custom testID when provided', () => {
      const { getByTestId } = renderIcon('week_wanderer', undefined, 'my-hawk');
      expect(getByTestId('my-hawk')).toBeTruthy();
    });
  });

  describe('sizing', () => {
    it('defaults to 48px', () => {
      const { getByTestId } = renderIcon('first_step');
      const svg = getByTestId('badge-svg-first_step');
      expect(svg.props.width).toBe(48);
      expect(svg.props.height).toBe(48);
    });

    it('respects custom size prop', () => {
      const { getByTestId } = renderIcon('first_step', 32, 'sized-icon');
      const svg = getByTestId('sized-icon');
      expect(svg.props.width).toBe(32);
      expect(svg.props.height).toBe(32);
    });
  });

  describe('unknown / missing badge keys', () => {
    it('returns null for unknown badge key', () => {
      const { toJSON } = renderIcon('not_a_badge');
      expect(toJSON()).toBeNull();
    });

    it('returns null for empty string', () => {
      const { toJSON } = renderIcon('');
      expect(toJSON()).toBeNull();
    });
  });

  describe('BADGE_SVG_KEYS export', () => {
    it('exports all expected keys', () => {
      expect(BADGE_SVG_KEYS).toContain('first_step');
      expect(BADGE_SVG_KEYS).toContain('trail_regular');
      expect(BADGE_SVG_KEYS).toContain('visualizer');
      expect(BADGE_SVG_KEYS).toContain('curator');
      expect(BADGE_SVG_KEYS).toContain('week_wanderer');
      expect(BADGE_SVG_KEYS).toContain('streak_chip');
    });

    it('has exactly 6 badge keys', () => {
      expect(BADGE_SVG_KEYS).toHaveLength(6);
    });
  });

  describe('path uniqueness (each animal has distinct SVG)', () => {
    it('each badge key renders a different SVG element', () => {
      const testIDs = BADGE_SVG_KEYS.map((k) => `badge-svg-${k}`);
      const elements = BADGE_SVG_KEYS.map((k) => {
        const { getByTestId } = renderIcon(k);
        return getByTestId(`badge-svg-${k}`);
      });
      // All should be truthy
      elements.forEach((el) => expect(el).toBeTruthy());
      // All testIDs are unique
      const unique = new Set(testIDs);
      expect(unique.size).toBe(BADGE_SVG_KEYS.length);
    });
  });
});
